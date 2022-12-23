'use strict';
const TuyAPI = require('tuyapi');
const fs = require('fs');
const apiKeys = require('./apiKeys.json')
const dir = './'
const header = 'On / Off [1],Timer [9],Add Electricity [17],Current(mA) [18],Power(dW) [19],Voltage(dV) [20],Test Bit [21],Voltage Coefficient [22],Current Coefficient [23],Power Coefficient [24],Electricity Coefficient [25],Fault [26],Time(s)\n'

class Socket {
    write() {
        for (let val in this.data.dps) {
            fs.appendFileSync(this.file, `${this.data.dps[val]},`, function (err) {
                if (err) throw err;
            });
        }
        fs.appendFileSync(this.file, `${this.data.t}\n`, function (err) {
            if (err) throw err;
        });
    }

    ref = () => { this.device.refresh(); }

    constructor(name, id, key) {
        this.name = name;
        this.device = new TuyAPI({
            id: id,
            key: key,
            issueRefreshOnConnect: false
        });
        this.data = {
            dps: {
                '1': '',
                '9': '',
                '17': '',
                '18': '',
                '19': '',
                '20': '',
                '21': '',
                '22': '',
                '23': '',
                '24': '',
                '25': '',
                '26': ''
            },
            t: ''
        }
        this.file = `${dir}${name}.csv`;

        // Find device on network
        this.device.find().then(() => {
            // Connect to device
            this.device.connect();
            if (!fs.existsSync(this.file)) {
                fs.writeFileSync(this.file, header, function (err) {
                    if (err) throw err;
                })
            }
            setInterval(this.ref, 1000);
        });

        // Add event listeners
        this.device.on('connected', () => {
            console.log(`${this.name} is connected!`);
        });

        this.device.on('disconnected', () => {
            console.log(`${this.name} is disconnected`);
        });

        this.device.on('error', error => {
            console.log(`Error with ${this.name}!`, error);
        });

        this.device.on('dp-refresh', data => {
            //console.log('DP_REFRESH data from device: ', data);
            for (let val in data.dps) {
                this.data.dps[val] = data.dps[val];
            }
            this.data.t = data.t;
            this.write();
        });

        this.device.on('data', data => {
            console.log(`DATA from ${this.name}: `, data);
            for (let val in data.dps) {
                this.data.dps[val] = data.dps[val];
            }
        });
    }
}

var args = process.argv.slice(2);
if (args.length == 0) {
    console.log("No arguments were given");
    return;
}

let sockets = [];
for (let i in args) {
    const socket = args[i].split("=")[0];
    const name = args[i].split("=")[1];
    if (apiKeys[socket] == null) {
        console.log(`Device with the name "${socket}" is unknown`);
    }
    else {
        sockets.push(new Socket(name, apiKeys[socket].id, apiKeys[socket].key));
    }
}