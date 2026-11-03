import { gga, events } from "../core/globals.js";
import { installAttireRack } from "../helpers/attireRack.js";
import { attireRackSelection } from "../helpers/attireRackCommand.js";

export function setupAttireRackProxy() {
    installAttireRack(gga, events(12), events(345), events(579), attireRackSelection);
}
