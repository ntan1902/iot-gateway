const mqtt = require("mqtt")
const DynamicConfig = require("../service/dynamic_config")

class MqttConnector {
    constructor(config, gateway) {
        this.config = DynamicConfig.getConnectorConfig(config)
        this.gateway = gateway
    }

    run() {
        const config = this.config
        const gateway = this.gateway
        const options = {
            clientId: config.broker.clientId,
            connectTimeout: 5000,
            username: config.broker.security.username,
            password: config.broker.security.password,
        }

        // const client = mqtt.connect("mqtt://test.mosquitto.org", options)
        const client = mqtt.connect({host: config.host, port: config.port})

        client.on("connect", function () {
            console.log("MQTT connected")
            client.subscribe("v1/devices/gateway/telemetry", function (error) {
                console.log("Topic 'v1/devices/gateway/telemetry' subscribed")
                if (error) {
                    console.log("Error occur when subscribe", error)
                }
            })
        })

        client.on("message", function (topic, message) {
            if (!hasJsonStructure(message.toString())) {
                console.log("Wrong json formated message.")
                return
            }
            handleOnMessage(JSON.parse(message.toString()))
        })

        function handleOnMessage(message) {
            const timeseries = config.mapping[0].converter.timeseries
            const data = convertMessageData(message, timeseries)
            gateway.processConvertedData(data)
        }
    }
}

function convertMessageData(data, timeseries) {
    console.log(data)
    let json = {}
    timeseries.forEach((ts) => {
        const {type: typeTs, key: keyTs, value: valueTs} = ts // long, ${sensorModel}, ${temp}
        console.log(typeTs, keyTs, valueTs)

        const {keyTags, valueTags} = getKeyValueTags(keyTs, valueTs) // [sensorModel], [temp]
        console.log(keyTags, valueTags)

        // if (valueTags.length > 0) {
        //     if (type !== "string") {
        //         return "Combined key value data type can only be STRING."
        //     }
        //
        //     let strValue = value
        //     valueTags.forEach((valueTag) => {
        //         const dataValue = data[valueTag]
        //         const temp = "${" + valueTag + "}"
        //         strValue = strValue.replace(temp, dataValue)
        //     })
        //
        //     const jsonData = {}
        //     jsonData[key] = strValue
        //     json.push(jsonData)
        // } else {
        //     const jsonData = generateJsonObj(key, type, data[key])
        //     json.push(jsonData)
        // }

        let key = keyTs;
        let value = valueTs;

        keyTags.forEach(keyTag => {
            key = keyTs.replace("${" + keyTag + "}", data[keyTag])
        })
        valueTags.forEach(valueTag => {
            value = value.replace("${" + valueTag + "}", data[valueTag])
            console.log("***", value)
        })

        json = generateJson(typeTs, key, value, json)
    })

    return json
}

function hasJsonStructure(str) {
    if (typeof str !== "string") return false

    try {
        const result = JSON.parse(str)
        const type = Object.prototype.toString.call(result)
        return type === "[object Object]" || type === "[object Array]"
    } catch (err) {
        return false
    }
}

function getKeyValueTags(key, value) {
    // const count_names = value.match(/\${/g).length
    // const value_names = []
    // let str = value
    //
    // for (i = 0; i < count_names; i++) {
    //     const pre_idx = str.indexOf('${')
    //     const post_idx = str.indexOf('}')
    //
    //     const valueName = str.substring(pre_idx + 2, post_idx)
    //
    //     str = str.slice(post_idx + 1, str.length)
    //
    //     value_names.push(valueName)
    // }
    //
    // return value_names

    const keyTags = key.match(/\${[${A-Za-z0-9.^\]\[*_]*}/g) || []
    const valueTags = value.match(/\${[${A-Za-z0-9.^\]\[*_]*}/g) || []

    return {
        keyTags: keyTags.map(keyTag => keyTag.replace(/\${|}/g, "")),
        valueTags: valueTags.map(valueTag => valueTag.replace(/\${|}/g, ""))
    }

}

function generateJson(type, key, value, json) {
    let jsonValue
    if (type === "string") {
        jsonValue = String(value)
    } else if (type === "float" || type === "double" || type === "integer" || type === "long") {
        jsonValue = Number(value)
    } else if (type === "boolean") {
        jsonValue = Boolean(value)
    }
    json[key] = jsonValue

    return json
}

module.exports = MqttConnector
