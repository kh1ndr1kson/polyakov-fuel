import mongoose from 'mongoose'

// Connect to Database
await mongoose.connect(process.env.DB_CONNECT)

export const ticketSchema = new mongoose.Schema({
  info: String,
  status: String,
  payment_info: String,
  payment_balance: String,
  /* [driver, manager] - telegram models */
  driver: {
    id: Number,
    is_bot: Boolean,
    first_name: String,
    last_name: String,
    username: String,
    language_code: String,
    is_premium: Boolean
  },
  manager: {
    id: Number,
    is_bot: Boolean,
    first_name: String,
    last_name: String,
    username: String,
    language_code: String,
    is_premium: Boolean
  },
  tg_manager_message_id: Number,
  tg_driver_message_id: Number,
  refs: []
})

export const driverSchema = new mongoose.Schema({
  driver: {
    id: Number,
    is_bot: Boolean,
    first_name: String,
    last_name: String,
    username: String,
    language_code: String,
    is_premium: Boolean
  },
  balance: String,
  tg_last_message_id: Number,
  refs: []
})

// todo [__tickets, __drivers] - DEV model, change to [tickets, drivers] to PROD
export const Tickets = mongoose.model('tickets', ticketSchema)
export const Drivers = mongoose.model('drivers', driverSchema)
