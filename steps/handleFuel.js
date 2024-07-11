import {Markup} from "telegraf";
import {statuses} from "../utils/statuses.js";
import {handleTicket} from "./handleTicket.js";


const groupId = process.env.GROUP_ID; //  ID группы с менеджерами

export function handleFuel(bot, user) {
  bot.action('start_fuel', (ctx) => {
    ctx.replyWithMarkdown([
        'Кому будем пополнять карту?'
      ].join(''),
      Markup.inlineKeyboard([
        Markup.button.callback('Себе', 'start_fuel_self'),
        // Markup.button.callback('Другому человеку', 'start_fuel_any'),
      ])
    )

    bot.action('start_fuel_self', async (ctx) => {
      if (!user.phone_number) {
        // ctx.replyWithMarkdown([
        //     'Нажмите кнопку ниже, чтобы отправить свои контактные данные'
        //   ].join(''),
        //   Markup.keyboard([
        //     Markup.button.contactRequest('Отправить номер телефона'),
        //   ]).resize()
        // )
        ctx.replyWithMarkdown('Введите номер телефона:')

        // bot.on('text', async (ctx) => {
        //   user.phone_number = ctx.update.message.text
        //
        //   ctx.replyWithMarkdown([
        //       'Спасибо что поделились своим контактом.\n',
        //       `Ваш номер телефона: *${user.phone_number}* сохранен для дальнейших пополнений.\n\n`,
        //       'На какую сумму желаете пополнить карту? 😊'
        //     ].join(''),
        //     Markup.inlineKeyboard([
        //       [
        //         Markup.button.callback('500₽', 'action_price_500'),
        //         Markup.button.callback('1000₽', 'action_price_1000')
        //       ],
        //     ])
        //   )
        // })
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

    // bot.on('text', async (ctx) => {
    //   if (ctx.update.message.chat.id !== Number(groupId)) {
    //     ctx.replyWithMarkdown([
    //         'Спасибо что поделились своим контактом.\n',
    //         `Ваш номер телефона: *${user.phone_number}* сохранен для дальнейших пополнений.\n\n`,
    //         'На какую сумму желаете пополнить карту? 😊'
    //       ].join(''),
    //       Markup.inlineKeyboard([
    //         [
    //           Markup.button.callback('500₽', 'action_price_500'),
    //           Markup.button.callback('1000₽', 'action_price_1000')
    //         ]
    //       ])
    //     )
    //   }
    // })

    // bot.on('contact', (ctx) => {
    //   user = Object.assign(ctx.message.contact)
    //
    //   ctx.replyWithMarkdown([
    //       'Спасибо что поделились своим контактом.\n',
    //       `Ваш номер телефона: *${user.phone_number}* сохранен для дальнейших пополнений.\n\n`,
    //       'На какую сумму желаете пополнить карту? 😊'
    //     ].join(''),
    //     Markup.inlineKeyboard([
    //       [
    //         Markup.button.callback('500₽', 'action_price_500'),
    //         Markup.button.callback('1000₽', 'action_price_1000')
    //       ],
    //       // [
    //       //   Markup.button.callback('1 500₽', '1500'),
    //       //   Markup.button.callback('2 000₽', '2000'),
    //       // ],
    //       // [
    //       //   Markup.button.callback('2 500₽', '2500'),
    //       //   Markup.button.callback('3 000₽', '3000'),
    //       // ],
    //       // [
    //       //   Markup.button.callback('Другая сумма', 'other'),
    //       // ]
    //     ])
    //   )
    // })
  })

  /* Price actions */
  bot.action('action_price_500', async (ctx) => {
    const newTicket = await handleTicket(bot, user, 500, statuses.created)

    ctx.replyWithMarkdown(
      [
        'Спасибо.\nЗаявка на пополнение топливной карты успешно создана.\n\nПодождите, пожалуйста, Скоро менеджер одобрит заявку и Вам придет сюда сообщение для дальнейшей *оплаты*. \n\n',
        // `Заявка #${newTicket.key}\n`,
        // `Номер телефона: ${newTicket.body.phone_number}\n`,
        // `Статус: *${statuses.created}*\n`,
        // `К оплате: *${newTicket.body.price}₽*\n\n`,
      ].join('')
    )
  })

  bot.action('action_price_1000', async (ctx) => {
    const newTicket = await handleTicket(bot, user, 1000, statuses.created)

    ctx.replyWithMarkdown(
      [
        'Спасибо.\nЗаявка на пополнение топливной карты успешно создана.\n\nПодождите, пожалуйста, Скоро менеджер одобрит заявку и Вам придет сюда сообщение для дальнейшей *оплаты*. \n\n',
        // `Заявка #${newTicket.key}\n`,
        // `Номер телефона: ${newTicket.body.phone_number}\n`,
        // `Статус: *${statuses.created}*\n`,
        // `К оплате: *${newTicket.body.price}₽*\n\n`,
      ].join('')
    )
  })
}
