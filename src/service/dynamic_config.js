const modbusMasterConfig = require("../config/modbus").master
const mqttConfig = require("../config/mqtt")

const connectorConfigMapping = {
    "modbus.json": modbusMasterConfig,
    "mqtt.json": mqttConfig
}

const DynamicConfig = {
    getConnectorConfig(configFileName) {
        return connectorConfigMapping[configFileName]
    }
}

module.exports = DynamicConfig

