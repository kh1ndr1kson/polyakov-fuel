import {Markup} from "telegraf";
import {statuses} from "../utils/statuses.js";
import {handleTicket} from "./handleTicket.js";


const groupId = process.env.GROUP_ID; //  ID группы с менеджерами

export function handleFuel(bot, user) {
  bot.action('start_fuel', async (ctx) => {
    if (!user.phone_number) {
      ctx.replyWithMarkdown('Введите номер телефона:')
    } else {
      ctx.replyWithMarkdown([
          `Ваш номер телефона: *${user.phone_number}* 👋\n`,
          'Укажите сумму оплаты'
        ].join(''),
        Markup.inlineKeyboard([
          [
            Markup.button.callback('500₽', 'action_price_500'),
            Markup.button.callback('1000₽', 'action_price_1000')
          ],
          // [
          //   Markup.button.callback('1 500₽', '1500'),
          //   Markup.button.callback('2 000₽', '2000'),
          // ],
          // [
          //   Markup.button.callback('2 500₽', '2500'),
          //   Markup.button.callback('3 000₽', '3000'),
          // ],
          // [
          //   Markup.button.callback('Другая сумма', 'other'),
          // ]
        ])
      )
    }
  })

  /* Price actions */
  bot.action('action_price_500', async (ctx) => {
    const newTicket = await handleTicket(bot, user, 500, statuses.created)

    ctx.replyWithMarkdown(
      [
        'Спасибо.\nЗаявка на пополнение топливной карты успешно создана.\n\nПодождите, пожалуйста, скоро менеджер одобрит заявку и Вам придет сообщение для дальнейшей *оплаты*. \n\n',
      ].join('')
    )
  })

  bot.action('action_price_1000', async (ctx) => {
    const newTicket = await handleTicket(bot, user, 1000, statuses.created)

    ctx.replyWithMarkdown(
      [
        'Спасибо.\nЗаявка на пополнение топливной карты успешно создана.\n\nПодождите, пожалуйста, скоро менеджер одобрит заявку и Вам придет сообщение для дальнейшей *оплаты*. \n\n',
      ].join('')
    )
  })
}
