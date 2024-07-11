import { Telegraf, Markup } from 'telegraf'
import 'dotenv/config'
import {hello} from "./utils/hello.js";
import {commands} from "./utils/commands.js";
import {handleFuel} from "./steps/handleFuel.js";
import {escapers} from "@telegraf/entity";
import {tickets} from "./db.js";

const bot = new Telegraf(process.env.BOT_TOKEN);
const groupId = process.env.GROUP_ID; //  ID группы с менеджерами

// Хранилище данных о заявках
let user = {}

bot.telegram.setMyCommands(commands).then(r => {})

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
        const messageId = ctx.message.message_id
        const tid = Object.entries(tickets).filter(([key, body]) => body.message_id === messageId)[0][0]

        await bot.telegram.sendMessage(user.user_id, [
          `Заявка №${tid}\n`,
          `Статус: *Ожидание оплаты ⏳*\n`,
          `К оплате: *${tickets[tid].price}₽*\n\n`,
          `*Реквизиты для оплаты:*\n${escapers.MarkdownV2(ctx.update.message.text)}\n\n`,
          'После того, как Вы оплатили, нажмите на кнопку ниже',
        ].join(''), {
          parse_mode: 'MarkdownV2',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Я оплатил', callback_data: 'payment_trust' }]
            ]
          }
        })
      } else {
        await ctx.telegram.sendMessage(
          groupId,
          'Необходимо ответным сообщением на Заявку - отправить реквизиты.',
          { reply_to_message_id: ctx.message.message_id }
        );
      }
    }
  }
})

// Запуск бота
bot.launch().then(() => {
  console.log('Бот запущен!');
});

// Остановка бота (SIGINT, SIGTERM, SIGQUIT)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
process.once('SIGQUIT', () => bot.stop('SIGQUIT'));
