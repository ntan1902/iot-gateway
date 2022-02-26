// create an empty modbus client
const ModbusRTU = require("modbus-serial");
const DynamicConfig = require("../service/dynamic_config");

class ModbusConnector {

    constructor(config, gateway) {
        this.master = new ModbusRTU();
        this.gateway = gateway;
        // this.availableFunctions = {
        //     1: this.master.readCoils,
        //     2: this.master.readDiscreteInputs,
        //     3: this.master.readHoldingRegisters,
        //     4: this.master.readInputRegisters,
        //     5: this.master.writeCoil,
        //     6: this.master.writeRegister,
        //     15: this.master.writeCoils,
        //     16: this.master.writeRegisters,
        // }
        this.slaves = DynamicConfig.getConnectorConfig(config).slaves;
    }

    run() {
        setInterval(() => {
            // read the values of registers starting at address
            // on device number. and log the values to the console.
            this.slaves.forEach(slave => {

                slave.timeseries.forEach(async timeserie => {
                    // open connection to a tcp line
                    await this.master?.connectTCP(slave.host, {port: slave.port});
                    this.master?.setID(slave.unitId);
                    this.master?.setTimeout(slave.timeout)

                    this.master.readHoldingRegisters(timeserie.address, timeserie.registerCount, (err, res) => {
                        if (!err) {
                            this.convertAndPushToQueue(res.data[0], timeserie);
                        } else {
                            console.log(err)
                        }

                    })
                })

            })
        }, 1000)
    }

    convertAndPushToQueue(data, timeserie) {
        const key = timeserie.key;
        const type = timeserie.type;

        let value;
        if (type === 'string') {
            value = String(data);
        } else if (type === 'float' || type === 'double' || type === 'integer' || type === 'long') {
            value = Number(data);
        } else if (type === 'boolean') {
            value = Boolean(data);
        }

        const json= {};
        json[key] = value;

        this.gateway.processConvertedData(json);
    }

}

module.exports = ModbusConnector

