const mqtt = require("mqtt")
const DynamicConfig = require("../service/dynamic_config");

class MqttConnector {
    constructor(config, gateway) {
        this.config = DynamicConfig.getConnectorConfig(config)
        this.gateway = gateway
    }

    run() {
        const options = {
            clientId: this.config.broker.clientId,
            connectTimeout: 5000,
            username: this.config.broker.security.username,
            password: this.config.broker.security.password,
        }

        //const client = mqtt.connect("mqtt://test.mosquitto.org", options)
        const client = mqtt.connect(`mqtt://${this.config.host}:${this.config.port}`, options)

        client.on("connect", function () {
            console.log("MQTT connected")
            client.subscribe("v1/devices/gateway/telemetry", function (error) {
                if (error) {
                    console.log("Error occur when subscribe", error)
                }
            })
        })

        client.on("message", function (topic, message) {
            const data = JSON.parse(message.toString())
            this.gateway.processConvertedData(data)
        })
    }
}

module.exports = MqttConnector
