import {escapers} from "@telegraf/entity";
import {statuses} from "./statuses.js";

export const ticketManager = (ticket) => {
  return [
    `${statuses[ticket.status]}\n\n`,
    `_${escapers.MarkdownV2(ticket.info)}_\n\n`,
    ticket?.payment_balance ? `Текущий баланс: *${escapers.MarkdownV2(ticket?.payment_balance)} ₽*\n\n` : '',
    ticket.manager?.first_name ? `🧑‍💻 ${ticket.manager?.first_name} ${ticket?.manager?.last_name || ''}` : '',
  ].join('')
}
