import axios from "axios";
import axiosRetry from "axios-retry";
import baseUrl from "../src/constant/url.js";

const client = axios.create({baseURL: baseUrl})
axiosRetry(client, { retries: 10, retryDelay: axiosRetry.exponentialDelay, shouldResetTimeout: true })

export default client