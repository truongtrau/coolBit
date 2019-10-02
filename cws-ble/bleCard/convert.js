/* Copyright (C) Chelpis Co., Ltd. - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Steven Fong <contact@chelpis.com>, June 2018
 */
export const byteArrayToHex = (raw) => {
  return raw.map((item) => {
    return (item < 16 ? '0' : '') + item.toString(16)
  }).join('')
}

export const hexToByteArray = (str) => {
  if (!str) {
    return []
  }
  var a = []
  for (var i = 0, len = str.length; i < len; i += 2) {
    a.push(parseInt(str.substr(i, 2), 16))
  }
  return a
}
