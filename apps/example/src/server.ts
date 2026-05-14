/**
 * Application Entry Point
 *
 * Starts the Vest HTTP server via bootstrap/app.ts.
 */

import "reflect-metadata";
import "dotenv/config";
import { startApplication } from "./bootstrap/app.js";

startApplication();
