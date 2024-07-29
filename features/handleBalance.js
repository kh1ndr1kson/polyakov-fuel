import {GROUP_ID} from "../utils/constants.js";
import {escapers} from "@telegraf/entity";
import {Drivers} from "../db.js";

export async function handleBalance(bot, driver, info) {
  await bot.telegram.sendMessage(
    GROUP_ID,
    `❓ Узнать баланс\n\n_${escapers.MarkdownV2(info)}_`,
    { parse_mode: 'MarkdownV2' }
  )
    .then((msg) => {
      Drivers.findOne({ 'driver.id': driver.id })
        .then(async (entity) => {
          if (!entity) {
            await new Drivers({
              driver,
              balance: '',
              tg_last_message_id: msg.message_id,
              refs: [msg.message_id]
            }).save({ new: true })
          } else {
            await Drivers.findOneAndUpdate(
              { 'driver.id': driver.id },
              { tg_last_message_id: msg.message_id, $addToSet: { refs: msg.message_id } },
            )
          }
        })
    })
}
