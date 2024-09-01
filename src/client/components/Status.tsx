import React from 'react'
import { getMaxSpeed } from "../scripts/maxSpeed";
import "../css/status.css";
import StorageIcon from '@mui/icons-material/Storage';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import SpeedIcon from '@mui/icons-material/Speed';
import BoltIcon from '@mui/icons-material/Bolt';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import EastIcon from '@mui/icons-material/East';

function getStatusData(entries) {
	const cleanEntries = entries.filter((entry: Models.IEntry) => !entry.ignore);

	function getMean(prop) {
		const props = prop.split('.');
		let divider = 0; // cannot be hardcoded to cleanEntries.length because some properties don't exist on first or last dataPoint
		const value = cleanEntries.reduce((accumulatorValue, current) => {
			// find potentially nested value
			let value = current; // overwritten recursively, start as current
			for (const prop of props) { // iterate over split props (passed as parameter)
				value = value[prop]; // replace current with the next level or finished value
			}

			if (typeof value == "undefined") {
				return accumulatorValue;
			}

			divider++; // keep track of how many entries there are
			return parseFloat(accumulatorValue) + parseFloat(value);

		}, 0) / divider; // now that all values have been added together, devide by amount of them

		//console.log(prop + ": " + value + " divider: " + divider);
		return value;
	}


	function getVertical() {
		let up = 0, down = 0;

		for (let index = 0; index < cleanEntries.length; index++) {
			const entry = cleanEntries[index];
			if (!entry.distance) { continue; }

			const vertical = parseFloat(entry.distance.vertical);

			if (vertical > 0) {
				up += vertical;
			} else if (vertical < 0) {
				down += vertical;
			}
		}

		return [(up / 1000).toFixed(2), (down / 1000).toFixed(2)];
	}

	function getDistance() {
		return cleanEntries.reduce((accumulatorValue: number, entry) => {
			console.log(accumulatorValue);
			if (!entry.distance) { return accumulatorValue }
			return accumulatorValue + parseFloat(entry.distance.horizontal);
		}, 0) / 1000;
	}

	const ignoredEntries = entries.length - cleanEntries.length;
	const uploadMean = getMean("time.uploadDuration").toFixed(3);
	const speedGPSMean = (getMean("speed.gps") * 3.6).toFixed(1);
	const speedCalcMean = (getMean("speed.horizontal") * 3.6).toFixed(1);
	const verticalCalc = getVertical();
	const maxSpeed = getMaxSpeed(cleanEntries);
	const distance = getDistance().toFixed(2);

	return {
		ignoredEntries,
		uploadMean,
		speedGPSMean,
		speedCalcMean,
		maxSpeed,
		verticalCalc,
		distance
	}
}

function Status({ entries }: { entries: Models.IEntry[] }) {
	if (!entries?.length) {
		return <span className="noData cut">No Data to be displayed</span>
	}
	const statusData = getStatusData(entries);
	//const lastEntry = entries.at(-1);

	return (
		<table className="statusTable">
			<tbody>
				<tr>
					<td><StorageIcon /></td>
					<th>data</th>
					<td>
						{entries.length - statusData.ignoredEntries}<i className="strike" title="ignored">({statusData.ignoredEntries})</i>
					</td>
				</tr>

				<tr>
					<td><NetworkCheckIcon /></td>
					<th>Ø upload</th>
					<td>
						{statusData.uploadMean}s
					</td>
				</tr>

				<tr>
					<td><SpeedIcon /></td>
					<th>Ø speed</th>
					<td>
						<span>GPS: {statusData.speedGPSMean}km/h</span> <span>Calc: {statusData.speedCalcMean == "NaN" ? " - " : statusData.speedCalcMean}km/h</span>
					</td>
				</tr>

				<tr>
					<td><BoltIcon /></td>
					<th>maxSpeed</th>
					<td>
						<span>{statusData.maxSpeed}km/h</span>
					</td>
				</tr>

				<tr>
					<td><ShowChartIcon /></td>
					<th>vertical</th>
					<td>
						<span>{statusData.verticalCalc[0]}km up</span>,  <span>{statusData.verticalCalc[1]}km down</span>
					</td>
				</tr>

				<tr>
					<td><EastIcon /></td>
					<th>Distance</th>
					<td>
						<span>{statusData.distance}km</span>
					</td>
				</tr>
			</tbody>
		</table>
	)
}

export default Status
