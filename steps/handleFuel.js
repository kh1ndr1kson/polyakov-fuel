import {Markup} from "telegraf";
import {statuses} from "../utils/statuses.js";
import {handleTicket} from "./handleTicket.js";


const groupId = process.env.GROUP_ID; //  ID группы с менеджерами

export function handleFuel(bot, user) {
  bot.action('start_fuel', async (ctx) => {
      ctx.replyWithMarkdown([
        'Напишите в следующем сообщении необходимую информацию для пополнения карты:\n',
        '_(Ваше ФИО, название АЗС, сумма к пополнению)_'
      ].join(''))
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
