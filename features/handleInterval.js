import {GROUP_ID} from "../utils/constants.js";
import {Tickets} from "../db.js";

// GLOBAL interval by all tickets
export default function handleInterval(bot, delay) {
  // let intervalId

  setInterval(() => {
    Tickets.find({ manager: { $exists: false } })
      .then(async (tickets) => {
        if (tickets.length > 0) {
          tickets.forEach((item) => {
            send(item)
          })
        }
      })
  }, delay * 1000)

  function send(ticket) {
    bot.telegram.sendMessage(
      GROUP_ID,
      'Заявку до сих пор никто не взял 😒',
      { reply_to_message_id: ticket.tg_manager_message_id }
    )
      .then(async (msg) => {
        await Tickets.findOneAndUpdate(
          { _id: ticket._id },
          { $addToSet: { refs: msg.message_id } },
        )
      })
  }

  // function startInterval (list) {
  //   if (!intervalId) {
  //     intervalId = setInterval(() => {
  //       list.forEach((item) => {
  //         send(item.tg_manager_message_id)
  //       })
  //     }, delay * 1000)
  //   }
  // }
  //
  // function stopInterval () {
  //   clearInterval(intervalId)
  // }
  //
  // Tickets.find({ manager: { $exists: false } })
  //   .then(async (tickets) => {
  //     if (tickets.length > 0) {
  //       startInterval(tickets)
  //     } else stopInterval()
  //   })
}
