# ICON

> SE Requirement: 84

## Methods

## Example

```javascript

let cwsICX = new cws.ICX();
let publicKey = "0302b80ce810cdf2763b20b826b5b359c77b37f1443b913425345c6d6571f4b9ce"
let payload = {
    "to":"hxe86b015c06145965931aff551d4958256a86226e",
    "from":"hx76f46307b53686f2dd4a2c8ca2f22492e842c4bf",
    "stepLimit":"0xf4240",
    "nid":"0x3",
    "version":"0x3",
    "timestamp":"0x5863dbd0d5580",
    "value":"0x2dcbf4840eca0000"
}
cwsICX.signTransaction(payload, 0, publicKey).then(signedMessage => {
console.log(`signing result: ${signedMessage}`)
})

```