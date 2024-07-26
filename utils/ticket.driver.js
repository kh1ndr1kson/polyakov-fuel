import {escapers} from "@telegraf/entity";
import {statuses} from "./statuses.js";

export const ticketDriver = (ticket, payment_info = '', action_text = '') => {
  return [
    `${statuses[ticket.status]}\n\n`,
    `_${escapers.MarkdownV2(ticket.info)}_\n\n`,
    payment_info && `*Реквизиты для оплаты:*\n${escapers.MarkdownV2(payment_info)}\n\n`,
    action_text,
  ].join('')
}
