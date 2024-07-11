import {escapers} from "@telegraf/entity"
import {tickets} from "../db.js";
import {statuses} from "../utils/statuses.js";

const groupId = process.env.GROUP_ID; //  ID группы с менеджерами

export async function handleTicket(bot, user, price, status) {
  // Сохранение заявки
  const ticketId = Object.keys(tickets).length + 1 // Date.now().toString();
  let messageId = ''

  tickets[ticketId] = {
    user,
    price,
    status,
    manager: null,
  }

  try {
    await bot.telegram.sendMessage(groupId, [
      escapers.MarkdownV2(`#${ticketId}\n\n`),
      `❗ Новая заявка ❗\n\n`,
      `📱 *${user.phone_number}*\n`,
      `💸 *${price}*₽`,
    ].join(''), {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Принять заявку', callback_data: 'take_ticket' }]
        ]
      }
    }).then((r) => tickets[ticketId].message_id = r.message_id)
  } catch (error) {
    console.error(`Ошибка отправки заявки в группу:`, error)
  }

  bot.action('take_ticket', async (ctx) => {
    messageId = ctx.update.callback_query.message.message_id
    // const tid = ctx.update.callback_query.message.text.split('\n')[0].substring(1)
    const tid = Object.entries(tickets).filter(([key, body]) => body.message_id === messageId)[0][0]

    tickets[tid].status = statuses.processed
    tickets[tid].manager = ctx.update.callback_query.from

    await bot.telegram.editMessageText(
      groupId,
      messageId,
      null,
      [
        escapers.MarkdownV2(`#${tid}\n\n`),
        `${tickets[tid].status}\n\n`,
        `📱 *${tickets[tid].user.phone_number}*\n`,
        `💸 *${tickets[tid].price}*₽\n\n`,
        `🧑‍💻 ${tickets[tid].manager.first_name} ${tickets[tid].manager.last_name}`,
      ].join(''), {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            [
              // { text: '✅ Одобрить', callback_data: 'accept_ticket' },
              // { text: '❌ Отклонить', callback_data: 'cancel_ticket' }
            ]
          ]
        }
      }
    )

    // await bot.telegram.sendMessage(user.user_id, [
    //   `⏳ В обработке\n\n`,
    //   `*Заявка №${ticketId}*\n`,
    //   `📱 ${user.phone_number}\n`,
    //   `💸 *${price}₽*\n\n`,
    //   `🧑‍💻 ${mgr.first_name} ${mgr.last_name}`,
    // ].join(''), {
    //   parse_mode: 'MarkdownV2',
    //   reply_markup: {
    //     inline_keyboard: [
    //       // [{ text: 'Оплатить', callback_data: 'payment' }]
    //     ]
    //   }
    // })
  })

  bot.action('accept_ticket', async (ctx) => {
    if (ctx.update.callback_query.from.user_id !== tickets[ticketId].manager.user_id) {
      ctx.answerCbQuery('Ошибка доступа. Вы не являетесь менеджером этой заявки.')

      return
    }

    bot.telegram.reply(groupId, 'Accept_ticket')
  })

  // bot.on('text', async (ctx) => {
  //   if (ctx.update.message.chat.id === Number(groupId)) {
  //     if (ctx.update.message?.reply_to_message) {
  //       await bot.telegram.sendMessage(user.user_id, [
  //         `Заявка №${ticketId}\n`,
  //         `Статус: *Ожидание оплаты ⏳*\n`,
  //         `К оплате: *${price}₽*\n\n`,
  //         `*Реквизиты для оплаты:*\n${escapers.MarkdownV2(ctx.update.message.text)}\n\n`,
  //         'После того, как Вы оплатили, нажмите на кнопку ниже',
  //       ].join(''), {
  //         parse_mode: 'MarkdownV2',
  //         reply_markup: {
  //           inline_keyboard: [
  //             [{ text: 'Я оплатил', callback_data: 'payment_trust' }]
  //           ]
  //         }
  //       })
  //     } else {
  //       await bot.telegram.sendMessage(groupId, JSON.stringify(tickets))
  //     }
  //   }
  // })

  bot.action('payment_trust', async (ctx) => {
    tickets[ticketId].manager = ctx.update.callback_query.from

    const mgr = tickets[ticketId].manager

    await bot.telegram.editMessageText(
      groupId,
      messageId,
      null,
      [
        `⏳ В обработке\n\n`,
        `*Заявка №${ticketId}*\n`,
        `📱 ${user.phone_number}\n`,
        `💸 *${price}₽*\n\n`,
        `🚗 *Водитель подтвердил оплату*\n\n`,
        `🧑‍💻 ${mgr.first_name} ${mgr.last_name}`,
      ].join(''), {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Одобрить', callback_data: 'accept_ticket' }
            ]
          ]
        }
      }
    )
  })

  return {
    key: ticketId,
    body: tickets[ticketId]
  }
}
