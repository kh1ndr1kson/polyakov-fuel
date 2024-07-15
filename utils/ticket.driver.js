import {escapers} from "@telegraf/entity";

export const ticketDriver = (uid, ticket, payment_info = '', action_text = '') => {
  return [
    escapers.MarkdownV2(`Заявка №${uid}\n\n`),
    `Статус: ${ticket.status}\n`,
    `К оплате: *${ticket.price}₽*\n\n`,
    payment_info && `*Реквизиты для оплаты:*\n${escapers.MarkdownV2(payment_info)}\n\n`,
    action_text,
  ].join('')
}
