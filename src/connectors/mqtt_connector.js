const mqtt = require("mqtt")
const DynamicConfig = require("../service/dynamic_config")
const MessageConverter = require("../helpers/message_converter")
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
        //const client = mqtt.connect({host: config.host, port: config.port})

        client.on("connect", function () {
            console.log("MQTT connected.")
            client.subscribe(config.mapping[0].topicFilter, function (error) {
                console.log(`Topic '${config.mapping[0].topicFilter}' subscribed.`)
                if (error) {
                    console.log("Error occur when subscribe", error)
                }
            })
        })

        client.on("message", function (topic, message) {
            if (!MessageConverter.hasJsonStructure(message.toString())) {
                console.log("Wrong json formated message.")
                return
            }
            if (topic === config.mapping[0].topicFilter) {
                handleOnMessage(JSON.parse(message.toString()))
            }
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

        const {keyTags, valueTags} = MessageConverter.getKeyValueTags(keyTs, valueTs) // [sensorModel], [temp]
        console.log(keyTags, valueTags)

        let key = keyTs
        let value = valueTs

        keyTags.forEach((keyTag) => {
            key = keyTs.replace("${" + keyTag + "}", data[keyTag])
        })
        valueTags.forEach((valueTag) => {
            value = value.replace("${" + valueTag + "}", data[valueTag])
            console.log("***", value)
        })

        json = MessageConverter.generateJson(typeTs, key, value, json)
    })

    return json
}

module.exports = MqttConnector
