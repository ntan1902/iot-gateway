const MqttClient = require("../client/mqtt_client");
const DynamicClass = require("./dynamic_class");

class GatewayService {
    constructor({iot = {}, connectors = []}) {
        this.mqttClient = new MqttClient(iot);
        this.telemetryRequestTopic = iot.telemetryRequestTopic;
        this.accessToken = iot.security.accessToken;

        connectors.forEach(connector => {
            const connectorClass = DynamicClass.getConnectorClass(connector.type, connector.config, this);
            connectorClass.run();
        })
    }

    processConvertedData(convertedData) {

        const msg = {
            "token": this.accessToken,
            "json": convertedData,
        }

        console.log(msg)
        this.mqttClient.publishData(this.telemetryRequestTopic, msg);
    }
}

module.exports = GatewayService;