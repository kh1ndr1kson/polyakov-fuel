import { Telegraf, Markup } from 'telegraf'
import 'dotenv/config'
import {hello} from "./utils/hello.js";
import {commands} from "./utils/commands.js";
import {handleFuel} from "./steps/handleFuel.js";
import {escapers} from "@telegraf/entity";
import {tickets} from "./db.js";
import {ticketDriver} from "./utils/ticket.driver.js";
import {statuses} from "./utils/statuses.js";
import {ticketManager} from "./utils/ticket.manager.js";

const bot = new Telegraf(process.env.BOT_TOKEN);
const groupId = process.env.GROUP_ID; //  ID группы с менеджерами

bot.telegram.setMyCommands(commands).then(r => {})

const user = {
  chat_id: null,
  phone_number: null,
}

bot.start((ctx) => {
  if (ctx.update.message.chat.id === Number(groupId)) {
    ctx.replyWithMarkdown([
      'Извините, команды *Бота* недоступены внутри группы 😞'
    ].join(''))

    return // exit
  }

  ctx.replyWithMarkdown([
    `${hello()} 👋\n`,
    'Я помогу Вам пополнить топливную карту *ОПТИ 24*.',
    // 'Если хотите сделать это прямо сейчас, нажмите на кнопку ниже ⬇️'
    ].join(''),
    Markup.inlineKeyboard([
      Markup.button.callback('Пополнить карту', 'start_fuel'),
    ])
  )

  handleFuel(bot, user)
})

bot.on('text', async (ctx) => {
  if (ctx.chat.type === 'private') {
    user.chat_id = ctx.update.message.chat.id
    user.phone_number = ctx.update.message.text

    ctx.replyWithMarkdown([
        'Спасибо что поделились своим контактом.\n',
        `Ваш номер телефона: *${user.phone_number}* сохранен для дальнейших пополнений.\n\n`,
        'На какую сумму желаете пополнить карту? 😊'
      ].join(''),
      Markup.inlineKeyboard([
        [
          Markup.button.callback('500₽', 'action_price_500'),
          Markup.button.callback('1000₽', 'action_price_1000')
        ]
      ])
    )
  } else if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
    if (ctx.update.message.chat.id === Number(groupId)) {
      if (ctx.update.message?.reply_to_message) {
        const messageId = ctx.update.message.message_id
        const replyMessageId = ctx.update.message?.reply_to_message.message_id
        const tid = Object.entries(tickets).filter(([key, body]) => body.manager_message_id === replyMessageId)[0][0]

        if (!tickets[tid].payment_info) {
          tickets[tid].payment_info = ctx.update.message.text

          // send from GROUP to DRIVER
          await bot.telegram.sendMessage(
            user.chat_id,
            ticketDriver(tid, tickets[tid], ctx.update.message.text, 'После оплаты, нажмите на кнопку ⬇️'),
            {
              parse_mode: 'MarkdownV2',
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Я оплатил', callback_data: `payment_trust_${tid}` }]
                ]
              }
            }
          )
            .then(async (r) => {
              tickets[tid].driver_message_id = r.message_id

              await ctx.telegram.sendMessage(
                groupId,
                'Спасибо. Я отправил Ваши реквизиты водителю.',
                { reply_to_message_id: messageId }
              )
            })
        } else {
          tickets[tid].status = statuses.accepted
          tickets[tid].payment_balance = ctx.update.message.text

          // update tickets [DRIVER, MANAGER]
          await bot.telegram.editMessageText(
            tickets[tid].user.chat_id,
            tickets[tid].driver_message_id,
            null,
            ticketDriver(tid, tickets[tid], '', ''),
            {
              parse_mode: 'MarkdownV2',
              reply_markup: { inline_keyboard: [ [ ] ] }
            }
          )

          await bot.telegram.editMessageText(
            groupId,
            tickets[tid].manager_message_id,
            null,
            ticketManager(tid, tickets[tid]),
            {
              parse_mode: 'MarkdownV2',
              reply_markup: { inline_keyboard: [ [ ] ] }
            }
          )

          await bot.telegram.sendMessage(
            user.chat_id, [
              `Заявка №${tid} ${tickets[tid].status}\n`,
              `Текущий баланс: *${tickets[tid].payment_balance}₽*\n\n`,
              '_Для повторного пополнения топливной карты нажмите кнопку ⬇️_'
            ].join(''), {
              parse_mode: 'MarkdownV2',
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Пополнить карту', callback_data: `start` }]
                ]
              }
            }
          )
            .then(async (r) => {
              await ctx.telegram.sendMessage(
                groupId,
                `Спасибо. Заявка успешно ${tickets[tid].status}`,
                { reply_to_message_id: messageId }
              )
            })
        }
      } else {
        await ctx.telegram.sendMessage(
          groupId,
          'Необходимо ответным сообщением на Заявку - отправить реквизиты.',
          { reply_to_message_id: ctx.message.message_id }
        )
      }
    }
  }
})

// Запуск бота
bot
  .launch()
  .then(() => {
    console.log('Бот запущен!');
  }
);

// Остановка бота (SIGINT, SIGTERM, SIGQUIT)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
process.once('SIGQUIT', () => bot.stop('SIGQUIT'));
