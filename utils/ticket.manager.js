import {escapers} from "@telegraf/entity";

export const ticketManager = (ticket) => {
  return [
    `${ticket.status}\n\n`,
    `_${escapers.MarkdownV2(ticket.info)}_\n\n`,
    ticket.manager?.first_name ? `🧑‍💻 ${ticket.manager.first_name} ${ticket.manager.last_name}` : '',
  ].join('')
}
