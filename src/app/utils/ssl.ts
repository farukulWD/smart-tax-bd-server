import config from "../config";
const SSLCommerzPayment = require('sslcommerz-lts');

const store_id = config.store_id;
const store_passwd = config.store_password;
const is_live = config.is_live;


export const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);