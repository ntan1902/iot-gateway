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

        const client = mqtt.connect("mqtt://test.mosquitto.org", options)
        //const client = mqtt.connect(`mqtt://${config.host}:${config.port}`, options)

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
    const result = []
    timeseries.forEach((ts) => {
        const {type, key, value} = ts
        const tsValueFormat = getTimeseriesValueFormat(value)
        if (tsValueFormat.length > 1) {
            if (type !== "string") {
                return "Combined key value data type can only be STRING."
            }
            let str_value = value
            tsValueFormat.map((tsv) => {
                const data_value = data[tsv]
                const temp = "${" + tsv + "}"
                str_value = str_value.replace(temp, data_value)
            })
            const json_data = {}
            json_data[key] = str_value
            result.push(json_data)
        } else {
            const json_data = generateJsonObj(key, type, data[tsValueFormat])
            result.push(json_data)
        }
    })

    return result
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

function getTimeseriesValueFormat(value) {
    const count_names = value.match(/\${/g).length
    const value_names = []
    let str = value
    
    for (i = 0; i < count_names; i++) {
        const pre_idx = str.indexOf('${')
        const post_idx = str.indexOf('}')

        const valueName = str.substring(pre_idx + 2, post_idx)

        str = str.slice(post_idx + 1, str.length)

        value_names.push(valueName)
    }

    return value_names
}

function generateJsonObj(key, type, value) {
    let json_value
    if (type === "string") {
        json_value = String(value)
    } else if (type === "float" || type === "double" || type === "integer" || type === "long") {
        json_value = Number(value)
    } else if (type === "boolean") {
        json_value = Boolean(value)
    }
    const json_data = {}
    json_data[key] = json_value

    return json_data
}

module.exports = MqttConnector
