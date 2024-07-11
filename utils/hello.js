export function hello() {
  const TOD = new Date().getHours()

  if (TOD <= 3 && TOD >= 0) {
    return 'Доброй ночи'
  } else if (TOD <= 12 && TOD >= 4) {
    return 'Доброе утро'
  } else if (TOD <= 17 && TOD >= 13) {
    return 'Добрый день'
  } else if (TOD <= 23 && TOD >= 18) {
    return 'Добрый вечер'
  }
}
