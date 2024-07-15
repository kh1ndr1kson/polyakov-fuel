import {escapers} from "@telegraf/entity";

export const ticketManager = (uid, ticket) => {
  return [
    escapers.MarkdownV2(`Заявка №${uid}\n\n`),
    `Статус: ${ticket.status}\n`,
    `Телефон: *${escapers.MarkdownV2(ticket.user.phone_number)}*\n`,
    `К оплате: *${ticket.price}₽*\n\n`,
    ticket.manager && `🧑‍💻 ${ticket.manager.first_name} ${ticket.manager.last_name}`,
  ].join('')
}
