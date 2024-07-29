import {Drivers} from "../db.js";
import {GROUP_ID} from "../utils/constants.js";
import {escapers} from "@telegraf/entity";

export default function onTextBalanceGroup(bot, ctx) {
  const message_id = ctx.update.message.message_id
  const reply_message_id = ctx.update.message?.reply_to_message.message_id
  const balance = ctx.update.message.text

  Drivers.findOneAndUpdate(
    { tg_last_message_id: reply_message_id },
    { balance, $addToSet: { refs: message_id } },
    { new: true }
  )
    .then(async ({ driver, refs }) => {
      await bot.telegram.sendMessage(
        driver.id,
        `Текущий баланс топливной карты: *${escapers.MarkdownV2(balance)} ₽*\n\n`,
        { parse_mode: 'MarkdownV2' }
      )

      await ctx.telegram.sendMessage(
        GROUP_ID,
        'Спасибо. Я отправил водителю актуальный баланс.',
        { reply_to_message_id: message_id }
      )
        .then(async (bot_reply) => {
          await Drivers.findOneAndUpdate(
            { 'driver.id': driver.id },
            { $set: { refs: [] } }
          )

          setTimeout(() => {
            const deletePromises = [...refs, bot_reply.message_id].map((id) =>
              bot.telegram.deleteMessage(GROUP_ID, id)
            )

            Promise.all(deletePromises)
          }, 2500)
        })
    })
}
