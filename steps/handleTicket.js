import {escapers} from "@telegraf/entity"
import {tickets} from "../db.js";
import {statuses} from "../utils/statuses.js";
import {ticketManager} from "../utils/ticket.manager.js";
import {ticketDriver} from "../utils/ticket.driver.js";

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
    await bot.telegram.sendMessage(groupId, ticketManager(ticketId, tickets[ticketId]),
      {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Принять заявку', callback_data: 'take_ticket' }]
          ]
        }
      }
    )
      .then((r) => tickets[ticketId].manager_message_id = r.message_id)
  } catch (error) {
    console.error(`Ошибка отправки заявки в группу:`, error)
  }

  bot.action('take_ticket', async (ctx) => {
    messageId = ctx.update.callback_query.message.message_id
    const tid = Object.entries(tickets).filter(([key, body]) => body.manager_message_id === messageId)[0][0]

    // update ticket
    tickets[tid].status = statuses.processed
    tickets[tid].manager = ctx.update.callback_query.from

    await bot.telegram.editMessageText(
      groupId,
      messageId,
      null,
      ticketManager(tid, tickets[tid]),
      {
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
  })

  bot.action('accept_ticket', async (ctx) => {
    if (ctx.update.callback_query.from.user_id !== tickets[ticketId].manager.user_id) {
      ctx.answerCbQuery('Ошибка доступа. Вы не являетесь менеджером этой заявки.')

      return
    }

    bot.telegram.reply(groupId, 'Accept_ticket')
  })

  bot.action(/^payment_trust_(\d+(\.\d+)?)$/, async (ctx) => {
    const tid = ctx.match[1]

    // update ticket
    tickets[tid].status = statuses.trusted

    await bot.telegram.editMessageText(
      groupId,
      messageId,
      null,
      ticketManager(tid, tickets[tid]),
      {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            [
              // { text: 'Подтвердить оплату', callback_data: 'accept_ticket' }
            ]
          ]
        }
      }
    )
      .then(async (r) => {
        // send from GROUP to DRIVER
        await ctx.telegram.editMessageText(
          tickets[tid].user.chat_id,
          tickets[tid].driver_message_id,
          null,
          ticketDriver(tid, tickets[tid], '', 'Ожидайте подтверждения от менеджера ⏳'),
          {
            parse_mode: 'MarkdownV2',
            reply_markup: {
              inline_keyboard: [
                []
              ]
            }
          }
        )

        await ctx.telegram.sendMessage(
          groupId,
          'Водитель подтвердил оплату, проверяйте.',
          { reply_to_message_id: tickets[tid].manager_message_id }
        )
      })
  })

  return {
    key: ticketId,
    body: tickets[ticketId]
  }
}
