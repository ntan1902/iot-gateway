const ModbusConnector = require("../connectors/modbus_connector");
const MqttConnector = require("../connectors/mqtt_connector");


const connectorsMapping = {
    "modbus": ModbusConnector,
    "mqtt": MqttConnector
};

const DynamicClass = {
    getConnectorClass(type, config, gateway) {
        return new connectorsMapping[type](config, gateway);
    }
}

module.exports = DynamicClass