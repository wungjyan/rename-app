export function isValidRegex(str) {
  try {
    new RegExp(str)
    return true
  } catch (e) {
    return false
  }
}
