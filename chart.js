document.addEventListener('DOMContentLoaded', function () {
    // Display the loading_chart indicator
    const loadingIndicator = document.getElementById('loading_chart');
    loadingIndicator.style.display = 'block';

    // How loading option
    showDatmanLoad(type, cwms_ts_id_2, loading);

    const tsids = [];

    // Add the first cwms_ts_id without the _1 suffix
    let cwmsTsId = cwms_ts_id;  // Use the initial cwms_ts_id value
    if (cwmsTsId) {
        tsids.push({ cwms_ts_id: encodeURIComponent(cwmsTsId) });
    }

    // Loop through cwms_ts_id_1 to cwms_ts_id_50
    for (let i = 1; i <= 50; i++) {
        cwmsTsId = window[`cwms_ts_id_${i}`];  // Dynamically access cwms_ts_id_1 to cwms_ts_id_50
        if (cwmsTsId) {
            tsids.push({ cwms_ts_id: encodeURIComponent(cwmsTsId) });
        }
    }

    console.log("tsids: ", tsids);  // Logs the tsids array with all non-null cwms_ts_id values

    // Filter out tsids where cwms_ts_id is null or undefined
    const validTsids = tsids.filter(data => data.cwms_ts_id !== null && data.cwms_ts_id !== undefined && data.cwms_ts_id !== 'null');
    // console.log("validTsids = ", validTsids);

    // Get current date and time
    const currentDateTime = new Date();
    // console.log("currentDateTime = ", currentDateTime);

    // Subtract thirty hours from current date and time
    const currentDateTimeMinusLookBack = subtractHoursFromDate(currentDateTime, lookback);
    // console.log("currentDateTimeMinusLookBack = ", currentDateTimeMinusLookBack);

    // Add thirty hours from current date and time
    const currentDateTimeAddLookForward = addHoursFromDate(currentDateTime, lookforward);
    // console.log("currentDateTimeAddLookForward = ", currentDateTimeAddLookForward);

    // Subtract thirty hours from current date and time
    const currentDateTimeMinusLookBackDays = subtractDaysFromDate(currentDateTime, lookback);
    // console.log("currentDateTimeMinusLookBack = ", currentDateTimeMinusLookBack);

    // Add thirty hours from current date and time
    const currentDateTimeAddLookForwardDays = addDaysFromDate(currentDateTime, lookforward);
    // console.log("currentDateTimeAddLookForward = ", currentDateTimeAddLookForward);

    let baseUrl = null;
    if (cda === "public") {
        baseUrl = `https://cwms-data.usace.army.mil/cwms-data`;
    } else if (cda === "internal") {
        baseUrl = `https://wm.${office.toLowerCase()}.ds.usace.army.mil:8243/mvs-data`;
    } else {
        baseUrl = null;
    }

    // Map each dataset to its corresponding URL
    const timeseriesUrl = validTsids.map(data => {
        const queryString = data.cwms_ts_id; // Assuming this is correct
        return `${baseUrl}/timeseries?page-size=40000&name=${queryString}&begin=${currentDateTimeMinusLookBackDays.toISOString()}&end=${currentDateTimeAddLookForwardDays.toISOString()}&office=${office}`;
    });
    // console.log("timeseriesUrl = ", timeseriesUrl);

    // Fetch all tsids simultaneously
    Promise.all(
        timeseriesUrl.map(url =>
            fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json;version=2'
                }
            })
        )
    )
        .then(responses => {
            return Promise.all(responses.map(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            }));
        })
        .then(datasets => {
            // console.log('datasets:', datasets);

            const nonEmptyDatasets = datasets.filter(data => data.values && data.values.length > 0);
            // console.log('nonEmptyDatasets:', nonEmptyDatasets);

            // First Location
            const firstDataset = nonEmptyDatasets[0];
            // console.log('firstDataset:', firstDataset);

            const values = nonEmptyDatasets[0].values;
            const dateTimes = (values.map(item => item[0])); // const dateTimes = (values.map(item => item[0])).map(formatDate); 
            // console.log('dateTimes:', dateTimes);

            const cwmsTsId = firstDataset.name;
            const unitId = firstDataset.units;
            const timeZone = firstDataset['time-zone'];
            const nameParts = firstDataset.name.split('.');
            const locationId = nameParts[0];
            const parameterId = nameParts[1];
            const versionId = nameParts[5];
            // console.log("locationId: ", locationId);  // St Louis-Mississippi
            // console.log("parameterId: ", parameterId);  // Stage
            // console.log("versionId: ", versionId);  // lrgsShef-rev

            // Second Location
            let parameterId2, unitId2 = null;
            if (nonEmptyDatasets.length > 1) {
                const secondDataset = nonEmptyDatasets[1];
                // console.log('secondDataset:', secondDataset);
                const values2 = nonEmptyDatasets[1].values;
                const dateTimes2 = (values2.map(item => item[0])).map(formatDate); // Adjusted to use formatDate function
                // console.log('dateTimes2:', dateTimes2);

                const cwmsTsId2 = secondDataset.name;
                unitId2 = secondDataset.units;
                const nameParts2 = secondDataset.name.split('.');
                const locationId2 = nameParts2[0];
                parameterId2 = nameParts2[1];
                // console.log("locationId2: ", locationId2);  // St Louis-Mississippi
                // console.log("parameterId2: ", parameterId2);  // Stage
                // console.log("unitId2: ", unitId2);  // ft
            }

            let payload = null;
            // Chart Type Setup
            if (nonEmptyDatasets.length === 1 & (parameterId === "Stage" || parameterId === "Elev")) {
                // console.log("============== for single dataset plot with location levels ==============");

                const levelIdFlood = locationId + ".Stage.Inst.0.Flood";
                // console.log(levelIdFlood);
                const levelIdHingeMin = locationId + ".Height.Inst.0.Hinge Min";
                // console.log(levelIdHingeMin);
                const levelIdHingeMax = locationId + ".Height.Inst.0.Hinge Max";
                // console.log(levelIdHingeMax);
                const levelIdLwrp = locationId + ".Stage.Inst.0.LWRP";
                // console.log(levelIdLwrp);
                const levelIdNgvd29 = locationId + ".Height.Inst.0.NGVD29";
                // console.log(levelIdLwrp);
                const levelIdEffectiveDate = "2024-01-01T08:00:00";

                // Define the URLs to fetch related data from
                const url1 = `${baseUrl}/levels/${levelIdFlood}?office=${office}&effective-date=${levelIdEffectiveDate}&unit=ft`;
                const url2 = `${baseUrl}/levels/${levelIdHingeMin}?office=${office}&effective-date=${levelIdEffectiveDate}&unit=ft`;
                const url3 = `${baseUrl}/levels/${levelIdHingeMax}?office=${office}&effective-date=${levelIdEffectiveDate}&unit=ft`;
                const url4 = `${baseUrl}/levels/${levelIdLwrp}?office=${office}&effective-date=${levelIdEffectiveDate}&unit=ft`;
                const url5 = `${baseUrl}/locations/${locationId}?office=${office}`;
                const url6 = `${baseUrl}/levels/${levelIdNgvd29}?office=${office}&effective-date=${levelIdEffectiveDate}&unit=ft`;
                const url7 = `${baseUrl}/catalog/TIMESERIES?page-size=10000&office=${office}`;
                // console.log('url1:', url1);
                // console.log('url2:', url2);
                // console.log('url3:', url3);
                // console.log('url4:', url4);
                // console.log('url5:', url5);
                // console.log('url6:', url6);
                // console.log('url7:', url7);

                // Fetch the related data
                Promise.all([
                    fetch(url1).then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    }).catch(error => {
                        // console.error('Error fetching data from url1:', error);
                        return null; // Return null if fetch failed
                    }),

                    fetch(url2)
                        .then(response => {
                            if (!response.ok) {
                                if (response.status === 404) {
                                    // Handle 404 specifically
                                    console.error('Error 404: Hinge Min resource not found');
                                    return null; // Return null if the resource is not found
                                }
                                throw new Error('Network response was not ok');
                            }
                            return response.json();
                        })
                        .catch(error => {
                            console.error('Error fetching data from url2:', error);
                            return null; // Return null if fetch failed for any reason
                        }),

                    fetch(url3)
                        .then(response => {
                            if (!response.ok) {
                                if (response.status === 404) {
                                    // Handle 404 specifically
                                    console.error('Error 404: Hinge Max resource not found');
                                    return null; // Return null if the resource is not found
                                }
                                throw new Error('Network response was not ok');
                            }
                            return response.json();
                        })
                        .catch(error => {
                            console.error('Error fetching data from url3:', error);
                            return null; // Return null if fetch failed for any reason
                        }),

                    fetch(url4)
                        .then(response => {
                            if (!response.ok) {
                                if (response.status === 404) {
                                    // Handle 404 specifically
                                    console.error('Error 404: LWRP resource not found');
                                    return null; // Return null if the resource is not found
                                }
                                throw new Error('Network response was not ok');
                            }
                            return response.json();
                        })
                        .catch(error => {
                            console.error('Error fetching data from url4:', error);
                            return null; // Return null if fetch failed for any reason
                        }),


                    fetch(url5).then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    }).catch(error => {
                        // console.error('Error fetching data from url5:', error);
                        return null; // Return null if fetch failed
                    }),

                    fetch(url6).then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    }).catch(error => {
                        // console.error('Error fetching data from url6:', error);
                        return null; // Return null if fetch failed
                    }),

                    fetch(url7).then(response => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    }).catch(error => {
                        // console.error('Error fetching data from url7:', error);
                        return null; // Return null if fetch failed
                    })

                ])
                    .then(metaDataArray => {
                        // console.log('metaDataArray:', metaDataArray);

                        const floodLevelData = metaDataArray[0];
                        const hingeMinData = metaDataArray[1];
                        const hingeMaxData = metaDataArray[2];
                        const lwrpData = metaDataArray[3];
                        const locationData = metaDataArray[4];
                        const ngvd29Data = metaDataArray[5];

                        const floodLevelTimeSeries = dateTimes.map(dateTime => {
                            // Check if floodLevelData contains a valid constant-level
                            if (floodLevelData && floodLevelData["constant-value"] !== undefined) {
                                // Set constant-value to null if it's greater than 900
                                const constantValue = floodLevelData["constant-value"] > 900 ? null : floodLevelData["constant-value"];
                                return {
                                    x: dateTime,
                                    y: constantValue
                                };
                            } else {
                                // Handle case where constant-level is not found or not valid
                                return {
                                    x: dateTime,
                                    y: null // or any default value you want to assign
                                };
                            }
                        });
                        // console.log("floodLevelTimeSeries: ", floodLevelTimeSeries);

                        const hingeMinTimeSeries = dateTimes.map(dateTime => {
                            // Check if hingeMinData contains a valid constant-level
                            if (hingeMinData && hingeMinData["constant-value"] !== undefined) {
                                return {
                                    x: dateTime,
                                    y: hingeMinData["constant-value"]
                                };
                            } else {
                                // Handle case where constant-level is not found or not valid
                                return {
                                    x: dateTime,
                                    y: null // or any default value you want to assign
                                };
                            }
                        });
                        // console.log("hingeMinTimeSeries: ", hingeMinTimeSeries);

                        const hingeMaxTimeSeries = dateTimes.map(dateTime => {
                            // Check if hingeMaxData contains a valid constant-level
                            if (hingeMaxData && hingeMaxData["constant-value"] !== undefined) {
                                return {
                                    x: dateTime,
                                    y: hingeMaxData["constant-value"]
                                };
                            } else {
                                // Handle case where constant-level is not found or not valid
                                return {
                                    x: dateTime,
                                    y: null // or any default value you want to assign
                                };
                            }
                        });
                        // console.log("hingeMaxTimeSeries: ", hingeMaxTimeSeries);

                        const lwrpTimeSeries = dateTimes.map(dateTime => {
                            // Check if lwrpData contains a valid constant-level
                            if (lwrpData && lwrpData["constant-value"] !== undefined) {
                                // Set constant-value to null if it's greater than 900
                                const constantValue = lwrpData["constant-value"] > 900 ? null : lwrpData["constant-value"];
                                return {
                                    x: dateTime,
                                    y: constantValue
                                };
                            } else {
                                // Handle case where constant-level is not found or not valid
                                return {
                                    x: dateTime,
                                    y: null // or any default value you want to assign
                                };
                            }
                        });
                        // console.log("lwrpTimeSeries: ", lwrpTimeSeries);

                        const series = [
                            {
                                label: cwmsTsId,
                                parameter_id: parameterId,
                                unit_id: unitId,
                                time_zone: timeZone,
                                data: firstDataset.values.map(item => ({ x: item[0], y: item[1] })),
                                borderColor: 'red',
                                backgroundColor: 'red',

                                borderWidth: 3, // Change the width of the connecting lines
                                tension: 0.5, // Adjust this value for the desired curve. 0: Represents straight lines. 1: Represents very smooth, rounded curves.
                                cubicInterpolationMode: 'default', // Set to 'default' for a solid and smooth line. 
                                pointRadius: 1, // Set pointRadius to 0 to hide data point dots
                                hoverBackgroundColor: 'rgba(0, 0, 255, 1)', // blue hoverBackgroundColor and hoverBorderColor: These parameters let you define the background and border colors when a user hovers over a chart element.
                                fill: false
                            },
                            {
                                label: 'Flood Level',
                                data: floodLevelTimeSeries,
                                borderColor: 'blue',
                                backgroundColor: 'blue',
                                fill: false,
                                borderWidth: 3, // Change the width of the connecting lines
                                pointRadius: 0.0, // Set pointRadius to 0 to hide data point dots
                                hidden: true // Initially hidden
                            },
                            hingeMinData !== null && {
                                label: 'Hinge Min',
                                data: hingeMinTimeSeries,
                                borderColor: 'black',
                                backgroundColor: 'black',
                                fill: false,
                                borderWidth: 3, // Change the width of the connecting lines
                                pointRadius: 0.0, // Set pointRadius to 0 to hide data point dots
                                hidden: true // Initially hidden
                            },
                            hingeMaxData !== null && {
                                label: 'Hinge Max',
                                data: hingeMaxTimeSeries,
                                borderColor: 'black',
                                backgroundColor: 'black',
                                fill: false,
                                borderWidth: 3, // Change the width of the connecting lines
                                pointRadius: 0.0, // Set pointRadius to 0 to hide data point dots
                                hidden: true // Initially hidden
                            },
                            lwrpData !== null && {
                                label: 'LWRP',
                                data: lwrpTimeSeries,
                                borderColor: 'black',
                                backgroundColor: 'black',
                                fill: false,
                                borderWidth: 3, // Change the width of the connecting lines
                                pointRadius: 0.0, // Set pointRadius to 0 to hide data point dots
                                hidden: true // Initially hidden
                            }
                        ].filter(series => series);

                        console.log("series: ", series);

                        // Create Chart JS
                        plotData(series, lookback);

                        // Get flood level
                        const floodLevel = getFloodLevel(floodLevelTimeSeries);

                        let payload = null;

                        if (type === "loading" && loading === null) {
                            // *****************************************
                            // Load datman data to cwms
                            // *****************************************

                            // console.log("series: ", (series));
                            // console.log("series: ", (series[0][`data`]));

                            const _data = series[0][`data`];

                            const convertedData = _data.map(entry => ({
                                timestamp: new Date(entry.x).toString(), // Converts the Unix timestamp to a readable format
                                value: entry.y,
                            }));

                            console.log("convertedData: ", convertedData);

                            // Filter out the data points where the time is exactly 8:00 AM
                            const filteredData = convertedData.filter(point => {
                                const date = new Date(point.timestamp);
                                return (date.getHours() === 8 && date.getMinutes() === 0);
                            });

                            // Log filtered data for debugging
                            console.log("filteredData: ", filteredData);

                            console.log("cwms_ts_id: ", cwms_ts_id);
                            const parts = cwms_ts_id.split('.');
                            // Reassemble the first two parts
                            const extractedLocationId = `${parts[0]}`;
                            console.log('extractedLocationId: ', extractedLocationId);

                            const extractedVersionId = `${parts[5]}`;
                            console.log('extractedVersionId: ', extractedVersionId);

                            let parameterDatman = null;
                            if (extractedVersionId === "29" || extractedLocationId === "Pump Sta 1-Wood River E Alton") {
                                parameterDatman = "Elev";
                            } else {
                                parameterDatman = "Stage";
                            }

                            const extentData = metaDataArray[6];
                            console.log("extentData: ", extentData);

                            const payloadTsid = `${extractedLocationId}.${parameterDatman}.Inst.~1Day.0.datman-rev`;
                            console.log("payloadTsid: ", payloadTsid);

                            function findMatchingEntry(payloadTsid, extentData) {
                                // Loop through the entries array to find the matching name
                                for (const entry of extentData.entries) {
                                    if (entry.name === payloadTsid) {
                                        return entry; // Return the matching entry
                                    }
                                }
                                // Return null if no match is found
                                return null;
                            }

                            const result = findMatchingEntry(payloadTsid, extentData);

                            if (result) {
                                console.log("Matching entry found:", result);

                                // Call the function to render the table
                                displaySingleColumnTable(result);
                            } else {
                                console.log("No matching entry found for", payloadTsid);
                            }

                            // Filter the values to leave them as null if they are null or greater than 999
                            const filteredValues = filteredData.map(item => {
                                let value = item.value;

                                // Leave value as null if it is null or greater than 999
                                if (value === null || value > 999 || value < -999) {
                                    value = null; // Set to null if value is null or greater than 999
                                }

                                return [
                                    new Date(item.timestamp).getTime(),  // Convert timestamp to Unix time (ms)
                                    value,                               // Use the value (which is null if condition is met)
                                    0                                     // Always 0 as the third element
                                ];
                            });
                            console.log("filteredValues: ", filteredValues);


                            payload = {
                                "name": `${extractedLocationId}.${parameterDatman}.Inst.~1Day.0.datman-rev`,
                                "office-id": "MVS",
                                "units": "ft",
                                "values": filteredValues
                            };

                            console.log("payload: ", payload);

                            //************************************************/
                            // CDA BUTTON
                            // ***********************************************/ 
                            const statusBtn = document.querySelector(".status");
                            const cdaBtn = document.getElementById("cda-btn");

                            const statusBtnDelete = document.querySelector(".status_delete");
                            const cdaBtnDelete = document.getElementById("cda-delete-btn");

                            const statusDatman = document.querySelector(".datman_status");
                            const datmanBtn = document.getElementById("datman");

                            async function loginStateController() {
                                cdaBtn.disabled = true
                                if (await isLoggedIn()) {
                                    // Variables / attributes of the element/dom
                                    cdaBtn.innerText = "Save Datman"
                                } else {
                                    cdaBtn.innerText = "Login"
                                }
                                cdaBtn.disabled = false
                            }

                            async function loginStateControllerDelete() {
                                cdaBtnDelete.disabled = true
                                if (await isLoggedIn()) {
                                    // Variables / attributes of the element/dom
                                    cdaBtnDelete.innerText = "Delete Datman"
                                } else {
                                    cdaBtnDelete.innerText = "Login"
                                }
                                cdaBtnDelete.disabled = false
                            }

                            async function loginCDA() {
                                console.log("page");
                                if (await isLoggedIn()) return true;
                                console.log('is false');

                                // Redirect to login page
                                window.location.href = `https://wm.mvs.ds.usace.army.mil:8243/CWMSLogin/login?OriginalLocation=${encodeURIComponent(window.location.href)}`;
                            }

                            async function isLoggedIn() {
                                try {
                                    const response = await fetch("https://wm.mvs.ds.usace.army.mil/mvs-data/auth/keys", {
                                        method: "GET"
                                    });

                                    if (response.status === 401) return false;

                                    console.log('status', response.status);
                                    return true;

                                } catch (error) {
                                    console.error('Error checking login status:', error);
                                    return false;
                                }
                            }

                            async function writeTS(payload) {
                                if (!payload) throw new Error("You must specify a payload!");

                                try {
                                    statusBtn.innerHTML = 'Saving... <img src="images/loading4.gif" width="50" height="50" alt="Loading...">';

                                    const response = await fetch("https://wm.mvs.ds.usace.army.mil/mvs-data/timeseries?store-rule=REPLACE%20ALL", {
                                        method: "POST",
                                        headers: {
                                            "accept": "*/*",
                                            "Content-Type": "application/json;version=2",
                                        },


                                        body: JSON.stringify(payload)
                                    });

                                    if (!response.ok) {
                                        const errorText = await response.text();
                                        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                                    } else {
                                        statusBtn.innerText = "Write CWMS successful!";
                                    }

                                    // const data = await response.json();
                                    // console.log('Success:', data);
                                    // return data;
                                    return true;

                                } catch (error) {
                                    console.error('Error writing timeseries:', error);
                                    throw error;
                                }
                            }

                            async function deleteTS(payloadDelete) {
                                // Log the input payloadDelete and check if it's an array
                                console.log("payloadDelete =", payloadDelete);

                                // Throw an error if payloadDelete is not specified
                                if (!payloadDelete) throw new Error("You must specify a payloadDelete!");

                                // If payloadDelete is not an array, convert it to an array
                                if (!Array.isArray(payloadDelete)) {
                                    payloadDelete = [payloadDelete];
                                }

                                // Create an array of promises to handle multiple payloads
                                let promises = payloadDelete.map(ts_payload => {
                                    // Ensure payload attributes are correctly referenced, with computed property for 'office-id'
                                    const { name, ['office-id']: officeId, values } = ts_payload;

                                    // Check if the values array is present and has at least one entry
                                    if (!values || values.length === 0) {
                                        return { message: "No values provided", status: "invalid_data" };
                                    }

                                    // Extract the begin and end timestamps from the values array
                                    const begin = new Date(values[0][0]);  // first timestamp in values
                                    const end = new Date(values[values.length - 1][0]);  // last timestamp in values

                                    return fetch(`https://wm.mvs.ds.usace.army.mil/mvs-data/timeseries/${name}?office=${officeId}&begin=${begin.toISOString()}&end=${end.toISOString()}`, {
                                        method: "DELETE",
                                        headers: {
                                            "accept": "*/*",
                                            "Content-Type": "application/json;version=2",
                                        },
                                        // body: JSON.stringify(ts_payload) // Not needed for DELETE requests
                                    }).then(async r => {
                                        // Get the response message and status
                                        const message = await r.text();
                                        const status = r.status;
                                        return { message, status };
                                    }).catch(error => {
                                        // Handle fetch errors
                                        return { message: error.message, status: 'fetch_error' };
                                    });
                                });

                                // Wait for all promises to resolve
                                const return_values = await Promise.all(promises);
                                console.log("Return values from deleteTS:", return_values);

                                // Check for errors based on status and message content
                                const has_errors = return_values.some(v => v.status !== 200 || v.message.includes("error") || v.message.includes("fail"));
                                return has_errors;
                            }

                            // *****************************************
                            // Load datman data to datman schema
                            // *****************************************
                            let datmanPayload = payload;
                            console.log("datmanPayload: ", datmanPayload);

                            const tsCode = [
                                { name: "Allenville-Whitley Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76203018 },
                                { name: "Alton-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 76186018 },
                                { name: "Arnold-Meramec.Stage.Inst.~1Day.0.datman-rev", tscode: 45037018 },
                                { name: "Ashburn-Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 45082018 },
                                { name: "Birds Point-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 44999018 },
                                { name: "Breese-Shoal Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76244018 },
                                { name: "Brickeys Ldg-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45063018 },
                                { name: "Brownstown-Hickory Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 45027018 },
                                { name: "Byrnesville-Big.Stage.Inst.~1Day.0.datman-rev", tscode: 45070018 },
                                { name: "Cairo-Ohio.Stage.Inst.~1Day.0.datman-rev", tscode: 45007018 },
                                { name: "Cape Girardeau-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45064018 },
                                { name: "Carlyle Lk TW-Kaskaskia.Elev.Inst.~1Day.0.datman-rev", tscode: 45033018 },
                                { name: "Carlyle Lk-Kaskaskia.Elev.Inst.~1Day.0.datman-rev", tscode: 45032018 },
                                { name: "Carlyle-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 45030018 },
                                { name: "Champion City-Bourbeuse.Stage.Inst.~1Day.0.datman-rev", tscode: 936413018 },
                                { name: "Chester-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45065018 },
                                { name: "Chesterville-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 76199018 },
                                { name: "Commerce-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 44991018 },
                                { name: "Cooks Mill-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 45073018 },
                                { name: "Cowden-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 45042018 },
                                { name: "Des Arc-Big Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 77001018 },
                                { name: "Desloge-Big.Stage.Inst.~1Day.0.datman-rev", tscode: 101809018 },
                                { name: "Engineers Depot-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 936416018 },
                                { name: "Eureka-Meramec.Stage.Inst.~1Day.0.datman-rev", tscode: 45038018 },
                                { name: "Fairman-E Fork.Stage.Inst.~1Day.0.datman-rev", tscode: 76206018 },
                                { name: "Fayetteville-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 76246018 },
                                { name: "Fisk-St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 969954018 },
                                { name: "Florence-Illinois.Stage.Inst.~1Day.0.datman-rev", tscode: 76181018 },
                                { name: "Frankford-Spencer Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76258018 },
                                { name: "Fredericktown-L St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 45060018 },
                                { name: "Freeburg-Silver Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76247018 },
                                { name: "Grafton-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45083018 },
                                { name: "Grand Tower-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45020018 },
                                { name: "Grays Pt-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45059018 },
                                { name: "Hagers Grove-N Fork Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 44986018 },
                                { name: "Hardin-Illinois.Stage.Inst.~1Day.0.datman-rev", tscode: 76179018 },
                                { name: "Hecker-Richland Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76253018 },
                                { name: "Herculaneum-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 936414018 },
                                { name: "Hermann-Missouri.Flow.Inst.~1Day.0.datman-rev", tscode: 45016018 },
                                { name: "Hermann-Missouri.Stage.Inst.~1Day.0.datman-rev", tscode: 45053018 },
                                { name: "High Gate-Bourbeuse.Stage.Inst.~1Day.0.datman-rev", tscode: 45047018 },
                                { name: "Hoffman-Crooked Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 45022018 },
                                { name: "Holliday-Mid Fork Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 45062018 },
                                { name: "Iron Bridge-St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 76185018 },
                                { name: "Irondale-Big.Stage.Inst.~1Day.0.datman-rev", tscode: 45021018 },
                                { name: "Jefferson Brks-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 936415018 },
                                { name: "LD 22 TW-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 45044018 },
                                { name: "LD 22-Mississippi.Flow.Inst.~1Day.0.datman-rev", tscode: 45095018 },
                                { name: "LD 24 Pool-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 44627018 },
                                { name: "LD 24 TW-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 45074018 },
                                { name: "LD 25 Pool-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 44628018 },
                                { name: "LD 25 TW-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 45081018 },
                                { name: "LD 27 Pool-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 45039018 },
                                { name: "LD 27 TW-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 45002018 },
                                { name: "Lk Shelbyville-Kaskaskia.Elev.Inst.~1Day.0.datman-rev", tscode: 45035018 },
                                { name: "Louisiana-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45006018 },
                                { name: "Lovington-W Okaw.Stage.Inst.~1Day.0.datman-rev", tscode: 76248018 },
                                { name: "Madison-Elk Fork Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 45026018 },
                                { name: "Mark Twain Lk TW-Salt.Elev.Inst.~1Day.0.datman-rev", tscode: 45008018 },
                                { name: "Mark Twain Lk-Salt.Elev.Inst.~1Day.0.datman-rev", tscode: 45088018 },
                                { name: "Mel Price Pool-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 44606018 },
                                { name: "Mel Price TW-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 44166018 },
                                { name: "Meredosia-Illinois.Flow.Inst.~1Day.0.datman-rev", tscode: 45015018 },
                                { name: "Meredosia-Illinois.Stage.Inst.~1Day.0.datman-rev", tscode: 76184018 },
                                { name: "Millcreek-St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 45051018 },
                                { name: "Moccasin Springs-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 44996018 },
                                { name: "Mosier Ldg-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 76204018 },
                                { name: "Mt Vernon-Big Muddy.Stage.Inst.~1Day.0.datman-rev", tscode: 76259018 },
                                { name: "Mt Vernon-Casey Fork.Stage.Inst.~1Day.0.datman-rev", tscode: 76262018 },
                                { name: "Mulberry Grove-Hurricane Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76251018 },
                                { name: "Murphysboro-Big Muddy.Stage.Inst.~1Day.0.datman-rev", tscode: 76264018 },
                                { name: "Nav Pool-Kaskaskia.Elev.Inst.~1Day.0.datman-rev", tscode: 44990018 },
                                { name: "Nav TW-Kaskaskia.Elev.Inst.~1Day.0.datman-rev", tscode: 45043018 },
                                { name: "New London-Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 45004018 },
                                { name: "Norton Bridge-Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 45049018 },
                                { name: "Pacific-Meramec.Stage.Inst.~1Day.0.datman-rev", tscode: 45045018 },
                                { name: "Paris-Crooked Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76256018 },
                                { name: "Paris-Mid Fork Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 45001018 },
                                { name: "Patterson-St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 45091018 },
                                { name: "Perry-Lick Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76255018 },
                                { name: "Pierron-Shoal Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76220018 },
                                { name: "Pittsburg-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 45078018 },
                                { name: "Plumfield-Big Muddy.Stage.Inst.~1Day.0.datman-rev", tscode: 45046018 },
                                { name: "Posey-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 76219018 },
                                { name: "Price Ldg-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45085018 },
                                { name: "Pump Sta 1-Wood River E Alton.Elev.Inst.~1Day.0.datman-rev", tscode: 45005018 },
                                { name: "Ramsey-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 45096018 },
                                { name: "ReReg Pool-Salt.Elev.Inst.~1Day.0.datman-rev", tscode: 45089018 },
                                { name: "Red Bud-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 76254018 },
                                { name: "Red Rock Ldg-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45056018 },
                                { name: "Rend Lk TW-Big Muddy.Elev.Inst.~1Day.0.datman-rev", tscode: 45041018 },
                                { name: "Rend Lk-Big Muddy.Elev.Inst.~1Day.0.datman-rev", tscode: 45067018 },
                                { name: "Richwoods-Big.Stage.Inst.~1Day.0.datman-rev", tscode: 45019018 },
                                { name: "Roselle-St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 44993018 },
                                { name: "Saco-St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 45010018 },
                                { name: "Sam A Baker Park-Big Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 45071018 },
                                { name: "Sand Ridge-Big Muddy.Stage.Inst.~1Day.0.datman-rev", tscode: 76265018 },
                                { name: "Santa Fe-Long Branch.Stage.Inst.~1Day.0.datman-rev", tscode: 45079018 },
                                { name: "Santa Fe-S Fork Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 45040018 },
                                { name: "Shelbina-N Fork Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 76257018 },
                                { name: "Shelbyville TW-Kaskaskia.Elev.Inst.~1Day.0.datman-rev", tscode: 44998018 },
                                { name: "Shelbyville-Robinson Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76250018 },
                                { name: "St Charles-Missouri.Stage.Inst.~1Day.0.datman-rev", tscode: 45086018 },
                                { name: "St Francis-St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 45014018 },
                                { name: "St Louis-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 43830018 },
                                { name: "Steelville-Meramec.Stage.Inst.~1Day.0.datman-rev", tscode: 45000018 },
                                { name: "Sterling Ldg-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45057018 },
                                { name: "Sub-Big Muddy.Elev.Inst.~1Day.0.datman-rev", tscode: 45068018 },
                                { name: "Sub-Casey Fork.Elev.Inst.~1Day.0.datman-rev", tscode: 45018018 },
                                { name: "Sullivan-Meramec.Stage.Inst.~1Day.0.datman-rev", tscode: 44987018 },
                                { name: "Thebes-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45058018 },
                                { name: "Thompson Ldg-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 76200018 },
                                { name: "Troy-Cuivre.Stage.Inst.~1Day.0.datman-rev", tscode: 45024018 },
                                { name: "Union-Bourbeuse.Stage.Inst.~1Day.0.datman-rev", tscode: 45069018 },
                                { name: "Valley City-Illinois.Stage.Inst.~1Day.0.datman-rev", tscode: 76183018 },
                                { name: "Valley Park-Meramec.Stage.Inst.~1Day.0.datman-rev", tscode: 45061018 },
                                { name: "Vandalia-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 45097018 },
                                { name: "Venedy Station-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 76245018 },
                                { name: "Waltonville-Rayse Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76260018 },
                                { name: "Wappapello Lk-St Francis.Elev.Inst.~1Day.0.datman-rev", tscode: 44995018 }
                            ];

                            console.log("tsCode: ", tsCode);

                            // Match the name and get the corresponding tscode
                            const match = tsCode.find(ts => ts.name === datmanPayload.name);
                            console.log("match: ", match);

                            async function datmanLoading(datmanPayload) {
                                if (!datmanPayload) throw new Error("You must specify a payload!");

                                try {
                                    // Indicate that the process is ongoing
                                    statusDatman.innerHTML = 'Saving... <img src="images/loading4.gif" width="50" height="50" alt="Loading...">';

                                    // Log the payload for debugging
                                    console.log("datmanPayload being sent to the server: ", datmanPayload);

                                    // Make an HTTP POST request to the PHP function
                                    const response = await fetch('chart.php', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(datmanPayload), // Send the payload as a JSON string
                                    });

                                    // Log the raw HTTP response for debugging
                                    console.log("HTTP Response status: ", response.status);

                                    // Parse the JSON response from the server
                                    const result = await response.json();

                                    // Check if the response is okay
                                    if (response.ok) {
                                        console.log("Data saved successfully: ", result);
                                        statusDatman.innerText = "Write Datman successful!";
                                        return result; // Return result if needed for further processing
                                    } else {
                                        // Log server-side errors
                                        console.error("Error saving data on the server: ", result);
                                        statusDatman.innerText = "Failed to write data to Datman!";
                                        throw new Error(`Server error: ${result.message}`);
                                    }
                                } catch (error) {
                                    // Log any unexpected errors
                                    console.error("Error while saving timeseries: ", error.message);
                                    statusDatman.innerText = "Failed to write data to Datman!";
                                    throw error; // Re-throw the error for higher-level handling
                                }
                            }

                            console.log("payload to save/delete: ", payload);

                            cdaBtn.onclick = async () => {
                                if (cdaBtn.innerText === "Login") {
                                    const loginResult = await loginCDA();
                                    console.log({ loginResult });
                                    if (loginResult) {
                                        cdaBtn.innerText = "Submit";
                                    } else {
                                        statusBtn.innerText = "Failed to Login!";
                                    }
                                } else {
                                    try {
                                        // Write timeseries to CWMS via CDA
                                        console.log("Attempting to write CWMS schema...");
                                        await writeTS(payload);
                                        // statusBtn.innerText = "Write CWMS successful!";
                                    } catch (error) {
                                        statusBtn.innerText = "Failed to write data to CWMS!";
                                    }

                                    try {
                                        // Write timeseries to Datman via PHP
                                        console.log("Attempting to write Datman schema...");
                                        const updatedPayloadForDatman = processDatmanPayload(datmanPayload, match);
                                        console.log("updatedPayloadForDatman: ", updatedPayloadForDatman);

                                        datmanLoading(updatedPayloadForDatman);

                                        // Update the UI on success (already handled in datmanLoading)
                                    } catch (error) {
                                        // Handle errors (already handled in datmanLoading)
                                    }
                                }
                            };

                            cdaBtnDelete.onclick = async () => {
                                if (cdaBtnDelete.innerText === "Login") {
                                    const loginResult = await loginCDA();
                                    console.log({ loginResult });
                                    if (loginResult) {
                                        cdaBtnDelete.innerText = "Submit";
                                    } else {
                                        statusBtnDelete.innerText = "Failed to Login!";
                                    }
                                } else {
                                    try {
                                        // Delete timeseries to CDA
                                        console.log("Delete!");
                                        await deleteTS(payload);
                                        statusBtnDelete.innerText = "Delete successful!";
                                    } catch (error) {
                                        statusBtnDelete.innerText = "Failed to delete data!";
                                    }
                                }
                            };

                            loginStateController();
                            loginStateControllerDelete();

                            // Setup timers
                            setInterval(async () => {
                                loginStateController()
                                loginStateControllerDelete()
                            }, 10000) // time is in millis

                            // // Attach the click handler to the button
                            // datmanBtn.onclick = async () => {
                            //     try {
                            //         console.log("Attempting to write Datman schema...");

                            //         console.log("datmanPayload onclick: ", datmanPayload);

                            //         const updatedPayloadForDatman = processDatmanPayload(datmanPayload, match);
                            //         console.log("append payload for datman schema to save/delete: ", updatedPayloadForDatman);

                            //         // Wait for the operation to complete
                            //         datmanLoading(updatedPayloadForDatman);

                            //         // Update the UI on success
                            //         statusDatman.innerText = "Write Datman schema successful!";
                            //     } catch (error) {
                            //         // Handle errors and update the UI
                            //         console.error("Failed to write Datman schema: ", error.message);
                            //         statusDatman.innerText = "Failed to write data!";
                            //     }
                            // };

                            // Create Datman Table
                            document.getElementById('data_table_datman').innerHTML = createTableDatman(filteredData, floodLevel);
                        }

                        // Create Data Table
                        document.getElementById('data_table').innerHTML = createTable(series, floodLevel);

                        // Location Data
                        // console.log("locationData: ", locationData);
                        // Call the function with the locationData object
                        displayLocationData(locationData, ngvd29Data, versionId);

                        // NGVD29 Data
                        // console.log("ngvd29Data: ", ngvd29Data);
                        // Call the function with the locationData object
                        displayNgvd29Data(ngvd29Data, locationData, versionId);

                        // Call the main function to process and display 6am data
                        processDataAndDisplay(nonEmptyDatasets);

                        loadingIndicator.style.display = 'none';
                    })
                    .catch(error => {
                        console.error('Error fetching related data:', error);
                        loadingIndicator.style.display = 'none';
                    });
            } else if (nonEmptyDatasets.length === 1) {
                // console.log("============== for plotting flow, precip and water quality ==============");

                const series = [
                    {
                        label: cwmsTsId,
                        parameter_id: parameterId,
                        unit_id: unitId,
                        time_zone: timeZone,
                        data: firstDataset.values.map(item => ({ x: item[0], y: item[1] })), // Mapping values to x and y properties
                        borderColor: 'red',
                        backgroundColor: 'red',

                        borderWidth: 3, // Change the width of the connecting lines
                        tension: 0.5, // Adjust this value for the desired curve. 0: Represents straight lines. 1: Represents very smooth, rounded curves.
                        cubicInterpolationMode: 'default', // Set to 'default' for a solid and smooth line. 
                        pointRadius: 1, // Set pointRadius to 0 to hide data point dots
                        hoverBackgroundColor: 'rgba(0, 0, 255, 1)', // blue hoverBackgroundColor and hoverBorderColor: These parameters let you define the background and border colors when a user hovers over a chart element.
                        fill: false
                    }
                ].filter(series => series);

                // // console.log(series);

                plotData(series, lookback);

                // Create Data Table
                document.getElementById('data_table').innerHTML = createTableWithoutFloodLevel(series);

                // Call the main function to process and display 6am data
                processDataAndDisplay(nonEmptyDatasets);

                // No metadata
                document.getElementById("gage_control_04").innerText = "Data available for single stage time series.";

                loadingIndicator.style.display = 'none';

            } else if (nonEmptyDatasets.length > 1 & (parameterId === parameterId2)) {
                // console.log("============== for multiple dataset plots with the same parameter id ==============");

                // More than one dataset has data, plot only the datasets
                const colors = [
                    'rgba(255, 99, 132, 1)',   // Red
                    'rgba(54, 162, 235, 1)',   // Blue
                    'rgba(0, 128, 0, 1)',      // Green
                    'rgba(153, 102, 255, 1)',  // Purple
                    'rgba(255, 159, 64, 1)',   // Orange
                    'rgba(255, 206, 86, 1)',   // Yellow
                    'rgba(169, 169, 169, 1)'   // Darker Gray
                ];


                const series = nonEmptyDatasets.map((data, index) => {
                    const cwmsTsId = data.name; // Retrieve cwmsTsId from each dataset

                    return {
                        label: cwmsTsId, // Unique label for each dataset
                        parameter_id: parameterId,
                        unit_id: unitId,
                        time_zone: timeZone,
                        data: data.values.map(item => ({ x: item[0], y: item[1] })),
                        borderColor: colors[index % colors.length],
                        backgroundColor: colors[index % colors.length],

                        borderWidth: 3, // Change the width of the connecting lines
                        tension: 0.5, // Adjust this value for the desired curve. 0: Represents straight lines. 1: Represents very smooth, rounded curves.
                        cubicInterpolationMode: 'default', // Set to 'default' for a solid and smooth line. 
                        pointRadius: 1, // Set pointRadius to 0 to hide data point dots
                        hoverBackgroundColor: 'rgba(0, 0, 255, 1)', // blue hoverBackgroundColor and hoverBorderColor: These parameters let you define the background and border colors when a user hovers over a chart element.
                        fill: false
                    };
                });

                console.log(series);

                // Plot Data
                plotData(series, lookback);

                if (type === "loading" && loading === "basin") {
                    console.log("Calling loading all gages in a basin.");

                    const payloads = [];
                    const datmanPayloads = [];

                    series.forEach((location) => {
                        console.log("Label:", location.label);
                        console.log("Parameter ID:", location.parameter_id);
                        console.log("Unit ID:", location.unit_id);
                        console.log("Time Zone:", location.time_zone);
                        console.log("Data Points:");

                        const convertedData = location.data.map((entry) => ({
                            timestamp: new Date(entry.x).toString(), // Converts the Unix timestamp to a readable format
                            value: entry.y,
                        }));

                        console.log("convertedData: ", convertedData);

                        // Filter out the data points where the time is exactly 8:00 AM
                        const filteredData = convertedData.filter(point => {
                            const date = new Date(point.timestamp);
                            return (date.getHours() === 8 && date.getMinutes() === 0);
                        });

                        // Log filtered data for debugging
                        console.log("filteredData: ", filteredData);

                        // Filter the values to leave them as null if they are null or greater than 999
                        const filteredValues = filteredData.map(item => {
                            let value = item.value;

                            // Leave value as null if it is null or greater than 999
                            if (value === null || value > 999 || value < -999) {
                                value = null; // Set to null if value is null or greater than 999
                            }

                            return [
                                new Date(item.timestamp).getTime(),  // Convert timestamp to Unix time (ms)
                                value,                               // Use the value (which is null if condition is met)
                                0                                     // Always 0 as the third element
                            ];
                        });
                        console.log("filteredValues: ", filteredValues);

                        // Get location and version id to determine datman parameter
                        console.log("cwms_ts_id: ", location.label);
                        const parts = location.label.split('.');
                        const extractedLocationId = `${parts[0]}`;
                        console.log('extractedLocationId: ', extractedLocationId);
                        const extractedVersionId = `${parts[5]}`;
                        console.log('extractedVersionId: ', extractedVersionId);

                        // Prepare datman parameter
                        let parameterDatman = null;
                        if (extractedVersionId === "29" || extractedLocationId === "Pump Sta 1-Wood River E Alton") {
                            parameterDatman = "Elev";
                        } else {
                            parameterDatman = "Stage";
                        }

                        // Prepare payload tsids 
                        const payloadTsid = `${extractedLocationId}.${parameterDatman}.Inst.~1Day.0.datman-rev`;
                        console.log("payloadTsid: ", payloadTsid);

                        const payload = {
                            "name": payloadTsid,
                            "office-id": "MVS",
                            "units": "ft",
                            "values": filteredValues
                        };
                        console.log("payload: ", payload);

                        payloads.push(payload);

                        // *******************************
                        const tsCode = [
                            { name: "Allenville-Whitley Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76203018 },
                            { name: "Alton-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 76186018 },
                            { name: "Arnold-Meramec.Stage.Inst.~1Day.0.datman-rev", tscode: 45037018 },
                            { name: "Ashburn-Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 45082018 },
                            { name: "Birds Point-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 44999018 },
                            { name: "Breese-Shoal Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76244018 },
                            { name: "Brickeys Ldg-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45063018 },
                            { name: "Brownstown-Hickory Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 45027018 },
                            { name: "Byrnesville-Big.Stage.Inst.~1Day.0.datman-rev", tscode: 45070018 },
                            { name: "Cairo-Ohio.Stage.Inst.~1Day.0.datman-rev", tscode: 45007018 },
                            { name: "Cape Girardeau-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45064018 },
                            { name: "Carlyle Lk TW-Kaskaskia.Elev.Inst.~1Day.0.datman-rev", tscode: 45033018 },
                            { name: "Carlyle Lk-Kaskaskia.Elev.Inst.~1Day.0.datman-rev", tscode: 45032018 },
                            { name: "Carlyle-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 45030018 },
                            { name: "Champion City-Bourbeuse.Stage.Inst.~1Day.0.datman-rev", tscode: 936413018 },
                            { name: "Chester-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45065018 },
                            { name: "Chesterville-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 76199018 },
                            { name: "Commerce-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 44991018 },
                            { name: "Cooks Mill-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 45073018 },
                            { name: "Cowden-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 45042018 },
                            { name: "Des Arc-Big Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 77001018 },
                            { name: "Desloge-Big.Stage.Inst.~1Day.0.datman-rev", tscode: 101809018 },
                            { name: "Engineers Depot-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 936416018 },
                            { name: "Eureka-Meramec.Stage.Inst.~1Day.0.datman-rev", tscode: 45038018 },
                            { name: "Fairman-E Fork.Stage.Inst.~1Day.0.datman-rev", tscode: 76206018 },
                            { name: "Fayetteville-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 76246018 },
                            { name: "Fisk-St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 969954018 },
                            { name: "Florence-Illinois.Stage.Inst.~1Day.0.datman-rev", tscode: 76181018 },
                            { name: "Frankford-Spencer Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76258018 },
                            { name: "Fredericktown-L St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 45060018 },
                            { name: "Freeburg-Silver Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76247018 },
                            { name: "Grafton-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45083018 },
                            { name: "Grand Tower-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45020018 },
                            { name: "Grays Pt-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45059018 },
                            { name: "Hagers Grove-N Fork Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 44986018 },
                            { name: "Hardin-Illinois.Stage.Inst.~1Day.0.datman-rev", tscode: 76179018 },
                            { name: "Hecker-Richland Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76253018 },
                            { name: "Herculaneum-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 936414018 },
                            { name: "Hermann-Missouri.Flow.Inst.~1Day.0.datman-rev", tscode: 45016018 },
                            { name: "Hermann-Missouri.Stage.Inst.~1Day.0.datman-rev", tscode: 45053018 },
                            { name: "High Gate-Bourbeuse.Stage.Inst.~1Day.0.datman-rev", tscode: 45047018 },
                            { name: "Hoffman-Crooked Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 45022018 },
                            { name: "Holliday-Mid Fork Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 45062018 },
                            { name: "Iron Bridge-St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 76185018 },
                            { name: "Irondale-Big.Stage.Inst.~1Day.0.datman-rev", tscode: 45021018 },
                            { name: "Jefferson Brks-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 936415018 },
                            { name: "LD 22 TW-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 45044018 },
                            { name: "LD 22-Mississippi.Flow.Inst.~1Day.0.datman-rev", tscode: 45095018 },
                            { name: "LD 24 Pool-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 44627018 },
                            { name: "LD 24 TW-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 45074018 },
                            { name: "LD 25 Pool-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 44628018 },
                            { name: "LD 25 TW-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 45081018 },
                            { name: "LD 27 Pool-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 45039018 },
                            { name: "LD 27 TW-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 45002018 },
                            { name: "Lk Shelbyville-Kaskaskia.Elev.Inst.~1Day.0.datman-rev", tscode: 45035018 },
                            { name: "Louisiana-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45006018 },
                            { name: "Lovington-W Okaw.Stage.Inst.~1Day.0.datman-rev", tscode: 76248018 },
                            { name: "Madison-Elk Fork Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 45026018 },
                            { name: "Mark Twain Lk TW-Salt.Elev.Inst.~1Day.0.datman-rev", tscode: 45008018 },
                            { name: "Mark Twain Lk-Salt.Elev.Inst.~1Day.0.datman-rev", tscode: 45088018 },
                            { name: "Mel Price Pool-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 44606018 },
                            { name: "Mel Price TW-Mississippi.Elev.Inst.~1Day.0.datman-rev", tscode: 44166018 },
                            { name: "Meredosia-Illinois.Flow.Inst.~1Day.0.datman-rev", tscode: 45015018 },
                            { name: "Meredosia-Illinois.Stage.Inst.~1Day.0.datman-rev", tscode: 76184018 },
                            { name: "Millcreek-St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 45051018 },
                            { name: "Moccasin Springs-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 44996018 },
                            { name: "Mosier Ldg-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 76204018 },
                            { name: "Mt Vernon-Big Muddy.Stage.Inst.~1Day.0.datman-rev", tscode: 76259018 },
                            { name: "Mt Vernon-Casey Fork.Stage.Inst.~1Day.0.datman-rev", tscode: 76262018 },
                            { name: "Mulberry Grove-Hurricane Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76251018 },
                            { name: "Murphysboro-Big Muddy.Stage.Inst.~1Day.0.datman-rev", tscode: 76264018 },
                            { name: "Nav Pool-Kaskaskia.Elev.Inst.~1Day.0.datman-rev", tscode: 44990018 },
                            { name: "Nav TW-Kaskaskia.Elev.Inst.~1Day.0.datman-rev", tscode: 45043018 },
                            { name: "New London-Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 45004018 },
                            { name: "Norton Bridge-Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 45049018 },
                            { name: "Pacific-Meramec.Stage.Inst.~1Day.0.datman-rev", tscode: 45045018 },
                            { name: "Paris-Crooked Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76256018 },
                            { name: "Paris-Mid Fork Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 45001018 },
                            { name: "Patterson-St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 45091018 },
                            { name: "Perry-Lick Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76255018 },
                            { name: "Pierron-Shoal Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76220018 },
                            { name: "Pittsburg-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 45078018 },
                            { name: "Plumfield-Big Muddy.Stage.Inst.~1Day.0.datman-rev", tscode: 45046018 },
                            { name: "Posey-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 76219018 },
                            { name: "Price Ldg-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45085018 },
                            { name: "Pump Sta 1-Wood River E Alton.Elev.Inst.~1Day.0.datman-rev", tscode: 45005018 },
                            { name: "Ramsey-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 45096018 },
                            { name: "ReReg Pool-Salt.Elev.Inst.~1Day.0.datman-rev", tscode: 45089018 },
                            { name: "Red Bud-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 76254018 },
                            { name: "Red Rock Ldg-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45056018 },
                            { name: "Rend Lk TW-Big Muddy.Elev.Inst.~1Day.0.datman-rev", tscode: 45041018 },
                            { name: "Rend Lk-Big Muddy.Elev.Inst.~1Day.0.datman-rev", tscode: 45067018 },
                            { name: "Richwoods-Big.Stage.Inst.~1Day.0.datman-rev", tscode: 45019018 },
                            { name: "Roselle-St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 44993018 },
                            { name: "Saco-St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 45010018 },
                            { name: "Sam A Baker Park-Big Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 45071018 },
                            { name: "Sand Ridge-Big Muddy.Stage.Inst.~1Day.0.datman-rev", tscode: 76265018 },
                            { name: "Santa Fe-Long Branch.Stage.Inst.~1Day.0.datman-rev", tscode: 45079018 },
                            { name: "Santa Fe-S Fork Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 45040018 },
                            { name: "Shelbina-N Fork Salt.Stage.Inst.~1Day.0.datman-rev", tscode: 76257018 },
                            { name: "Shelbyville TW-Kaskaskia.Elev.Inst.~1Day.0.datman-rev", tscode: 44998018 },
                            { name: "Shelbyville-Robinson Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76250018 },
                            { name: "St Charles-Missouri.Stage.Inst.~1Day.0.datman-rev", tscode: 45086018 },
                            { name: "St Francis-St Francis.Stage.Inst.~1Day.0.datman-rev", tscode: 45014018 },
                            { name: "St Louis-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 43830018 },
                            { name: "Steelville-Meramec.Stage.Inst.~1Day.0.datman-rev", tscode: 45000018 },
                            { name: "Sterling Ldg-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45057018 },
                            { name: "Sub-Big Muddy.Elev.Inst.~1Day.0.datman-rev", tscode: 45068018 },
                            { name: "Sub-Casey Fork.Elev.Inst.~1Day.0.datman-rev", tscode: 45018018 },
                            { name: "Sullivan-Meramec.Stage.Inst.~1Day.0.datman-rev", tscode: 44987018 },
                            { name: "Thebes-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 45058018 },
                            { name: "Thompson Ldg-Mississippi.Stage.Inst.~1Day.0.datman-rev", tscode: 76200018 },
                            { name: "Troy-Cuivre.Stage.Inst.~1Day.0.datman-rev", tscode: 45024018 },
                            { name: "Union-Bourbeuse.Stage.Inst.~1Day.0.datman-rev", tscode: 45069018 },
                            { name: "Valley City-Illinois.Stage.Inst.~1Day.0.datman-rev", tscode: 76183018 },
                            { name: "Valley Park-Meramec.Stage.Inst.~1Day.0.datman-rev", tscode: 45061018 },
                            { name: "Vandalia-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 45097018 },
                            { name: "Venedy Station-Kaskaskia.Stage.Inst.~1Day.0.datman-rev", tscode: 76245018 },
                            { name: "Waltonville-Rayse Cr.Stage.Inst.~1Day.0.datman-rev", tscode: 76260018 },
                            { name: "Wappapello Lk-St Francis.Elev.Inst.~1Day.0.datman-rev", tscode: 44995018 }
                        ];
                        console.log("tsCode: ", tsCode);

                        const datmanPayloads = payloads;

                        datmanPayloads.forEach(payload => {
                            const match = tsCode.find(ts => ts.name === payload.name);
                            if (match) {
                                console.log("match: ", match);
                                payload.tscode = match.tscode; // Append the tscode to the payload
                            } else {
                                console.log("No match found for: ", payload.name);
                            }
                        });
                        console.log("datmanPayloads: ", datmanPayloads);

                        const updatedPayloadForDatman = processDatmanPayloadWithoutMatch(datmanPayloads);
                        console.log("updatedPayloadForDatman: ", updatedPayloadForDatman);

                    });
                    console.log("All payloads prepared: ", payloads);


                    // async function datmanLoading(datmanPayloads) {
                    //     if (!datmanPayload) throw new Error("You must specify a payload!");

                    //     try {
                    //         // Indicate that the process is ongoing
                    //         statusDatman.innerHTML = 'Saving... <img src="images/loading4.gif" width="50" height="50" alt="Loading...">';

                    //         // Log the payload for debugging
                    //         console.log("datmanPayload being sent to the server: ", datmanPayload);

                    //         // Make an HTTP POST request to the PHP function
                    //         const response = await fetch('chart.php', {
                    //             method: 'POST',
                    //             headers: { 'Content-Type': 'application/json' },
                    //             body: JSON.stringify(datmanPayload), // Send the payload as a JSON string
                    //         });

                    //         // Log the raw HTTP response for debugging
                    //         console.log("HTTP Response status: ", response.status);

                    //         // Parse the JSON response from the server
                    //         const result = await response.json();

                    //         // Check if the response is okay
                    //         if (response.ok) {
                    //             console.log("Data saved successfully: ", result);
                    //             statusDatman.innerText = "Write Datman successful!";
                    //             return result; // Return result if needed for further processing
                    //         } else {
                    //             // Log server-side errors
                    //             console.error("Error saving data on the server: ", result);
                    //             statusDatman.innerText = "Failed to write data to Datman!";
                    //             throw new Error(`Server error: ${result.message}`);
                    //         }
                    //     } catch (error) {
                    //         // Log any unexpected errors
                    //         console.error("Error while saving timeseries: ", error.message);
                    //         statusDatman.innerText = "Failed to write data to Datman!";
                    //         throw error; // Re-throw the error for higher-level handling
                    //     }
                    // }

                    //************************************************/
                    // CDA
                    // ***********************************************/ 
                    
                    const statusBtn = document.querySelector(".status");
                    const cdaBtn = document.getElementById("cda-btn");

                    const statusBtnDelete = document.querySelector(".status_delete");
                    const cdaBtnDelete = document.getElementById("cda-delete-btn");

                    const statusDatman = document.querySelector(".datman_status");
                    const datmanBtn = document.getElementById("datman");

                    async function loginStateController() {
                        cdaBtn.disabled = true
                        if (await isLoggedIn()) {
                            // Variables / attributes of the element/dom
                            cdaBtn.innerText = "Save Datman"
                        } else {
                            cdaBtn.innerText = "Login"
                        }
                        cdaBtn.disabled = false
                    }

                    async function loginStateControllerDelete() {
                        cdaBtnDelete.disabled = true
                        if (await isLoggedIn()) {
                            // Variables / attributes of the element/dom
                            cdaBtnDelete.innerText = "Delete Datman"
                        } else {
                            cdaBtnDelete.innerText = "Login"
                        }
                        cdaBtnDelete.disabled = false
                    }

                    async function loginCDA() {
                        console.log("page");
                        if (await isLoggedIn()) return true;
                        console.log('is false');

                        // Redirect to login page
                        window.location.href = `https://wm.mvs.ds.usace.army.mil:8243/CWMSLogin/login?OriginalLocation=${encodeURIComponent(window.location.href)}`;
                    }

                    async function isLoggedIn() {
                        try {
                            const response = await fetch("https://wm.mvs.ds.usace.army.mil/mvs-data/auth/keys", {
                                method: "GET"
                            });

                            if (response.status === 401) return false;

                            console.log('status', response.status);
                            return true;

                        } catch (error) {
                            console.error('Error checking login status:', error);
                            return false;
                        }
                    }

                    async function writeTS(payloads) {
                        if (!Array.isArray(payloads) || payloads.length === 0) {
                            throw new Error("You must specify a non-empty array of payloads!");
                        }

                        try {
                            statusBtn.innerHTML = 'Saving... <img src="images/loading4.gif" width="50" height="50" alt="Loading...">';

                            // Process each payload sequentially
                            for (const payload of payloads) {
                                const response = await fetch("https://wm.mvs.ds.usace.army.mil/mvs-data/timeseries?store-rule=REPLACE%20ALL", {
                                    method: "POST",
                                    headers: {
                                        "accept": "*/*",
                                        "Content-Type": "application/json;version=2",
                                    },
                                    body: JSON.stringify(payload),
                                });

                                if (!response.ok) {
                                    const errorText = await response.text();
                                    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                                }

                                console.log("Successfully wrote timeseries for payload:", payload);
                            }

                            // Only update the status after all payloads have been processed
                            statusBtn.innerText = "Write CWMS successful for all payloads!";
                            return true;

                        } catch (error) {
                            console.error('Error writing timeseries:', error);
                            statusBtn.innerText = "Failed to write data to CWMS!";
                            throw error;
                        }
                    }

                    async function deleteTS(payloads) {
                        // Log the input payloads and check if it's an array
                        console.log("payloads =", payloads);

                        // Throw an error if payloads is not specified
                        if (!payloads) throw new Error("You must specify payloads!");

                        // If payloads is not an array, convert it to an array
                        if (!Array.isArray(payloads)) {
                            payloads = [payloads];
                        }

                        // Create an array of promises to handle multiple payloads
                        let promises = payloads.map(async (ts_payload) => {
                            // Ensure payloads attributes are correctly referenced
                            const { name, ['office-id']: officeId, values } = ts_payload;

                            // Check if the values array is present and has at least one entry
                            if (!values || values.length === 0) {
                                return { message: "No values provided", status: "invalid_data" };
                            }

                            // Extract the begin and end timestamps from the values array
                            const begin = new Date(values[0][0]);  // first timestamp in values
                            const end = new Date(values[values.length - 1][0]);  // last timestamp in values

                            try {
                                const response = await fetch(`https://wm.mvs.ds.usace.army.mil/mvs-data/timeseries/${name}?office=${officeId}&begin=${begin.toISOString()}&end=${end.toISOString()}`, {
                                    method: "DELETE",
                                    headers: {
                                        "accept": "*/*",
                                        "Content-Type": "application/json;version=2",
                                    },
                                });

                                const message = await response.text();
                                const status = response.status;

                                return { message, status };
                            } catch (error) {
                                // Handle fetch errors
                                return { message: error.message, status: 'fetch_error' };
                            }
                        });

                        // Wait for all promises to resolve
                        const return_values = await Promise.all(promises);
                        console.log("Return values from deleteTS:", return_values);

                        // Check for errors based on status and message content
                        const has_errors = return_values.some(v => v.status !== 200 || v.message.includes("error") || v.message.includes("fail"));
                        return has_errors;
                    }

                    //************************************************/
                    // BUTTON
                    // ***********************************************/
                    cdaBtn.onclick = async () => {
                        if (cdaBtn.innerText === "Login") {
                            const loginResult = await loginCDA();
                            console.log({ loginResult });
                            if (loginResult) {
                                cdaBtn.innerText = "Submit";
                            } else {
                                statusBtn.innerText = "Failed to Login!";
                            }
                        } else {
                            try {
                                // Write timeseries to CWMS via CDA
                                console.log("Attempting to write CWMS schema...");
                                await writeTS(payloads);
                                // statusBtn.innerText = "Write CWMS successful!";
                            } catch (error) {
                                statusBtn.innerText = "Failed to write data to CWMS!";
                            }

                            try {
                                // Write timeseries to Datman via PHP
                                // console.log("Attempting to write Datman schema...");
                                // const updatedPayloadForDatman = processDatmanPayloadWithoutMatch(datmanPayloads);
                                // console.log("updatedPayloadForDatman: ", updatedPayloadForDatman);

                                // datmanLoading(updatedPayloadForDatman);

                                // Update the UI on success (already handled in datmanLoading)
                            } catch (error) {
                                // Handle errors (already handled in datmanLoading)
                            }
                        }
                    };

                    cdaBtnDelete.onclick = async () => {
                        if (cdaBtnDelete.innerText === "Login") {
                            const loginResult = await loginCDA();
                            console.log({ loginResult });
                            if (loginResult) {
                                cdaBtnDelete.innerText = "Submit";
                            } else {
                                statusBtnDelete.innerText = "Failed to Login!";
                            }
                        } else {
                            try {
                                // Delete timeseries to CDA
                                console.log("Delete!");
                                await deleteTS(payloads);
                                statusBtnDelete.innerText = "Delete successful!";
                            } catch (error) {
                                statusBtnDelete.innerText = "Failed to delete data!";
                            }
                        }
                    };

                    loginStateController();
                    loginStateControllerDelete();

                    // Setup timers
                    setInterval(async () => {
                        loginStateController()
                        loginStateControllerDelete()
                    }, 10000) // time is in millis
                }

                // Call the main function to process and display 6am data
                processDataAndDisplay(nonEmptyDatasets);

                // No metadata
                document.getElementById("gage_control_04").innerText = "Data available for single stage time series.";

                loadingIndicator.style.display = 'none';
            } else if (nonEmptyDatasets.length > 1 & (parameterId !== parameterId2)) {
                // console.log("===== For multiple line plots where parameter id are NOT the same =====");

                // More than one dataset has data, plot only the datasets
                const colors = [
                    'rgba(255, 99, 132, 1)',   // Red
                    'rgba(54, 162, 235, 1)',   // Blue
                    'rgba(75, 192, 192, 1)',   // Teal
                    'rgba(153, 102, 255, 1)',  // Purple
                    'rgba(255, 159, 64, 1)',   // Orange
                    'rgba(255, 206, 86, 1)',   // Yellow
                    'rgba(231, 233, 237, 1)'   // Gray
                ];

                const series = nonEmptyDatasets.map((data, index) => {
                    // Extracting dataset details
                    const cwmsTsId = data.name; // The name of the dataset
                    const parameterId = data.name.split('.')[1]; // The parameter ID from the dataset name
                    const unitId = data.units; // The unit ID

                    // Formatting the data points
                    const formattedData = data.values.map(item => ({ x: item[0], y: item[1] }));

                    // Returning the series object
                    return {
                        label: cwmsTsId,
                        parameter_id: parameterId,
                        unit_id: unitId,
                        data: formattedData,
                        borderColor: colors[index % colors.length], // Cycling through colors
                        backgroundColor: colors[index % colors.length], // Cycling through colors
                        yAxisID: parameterId, // Linking to the Y-axis

                        borderWidth: 3, // Change the width of the connecting lines
                        tension: 0.5, // Adjust this value for the desired curve. 0: Represents straight lines. 1: Represents very smooth, rounded curves.
                        cubicInterpolationMode: 'default', // Set to 'default' for a solid and smooth line. 
                        pointRadius: 1, // Set pointRadius to 0 to hide data point dots
                        hoverBackgroundColor: 'rgba(0, 0, 255, 1)', // blue hoverBackgroundColor and hoverBorderColor: These parameters let you define the background and border colors when a user hovers over a chart element.
                        fill: false
                    };
                });

                // console.log("series: ", series);

                // Plot Data
                plotData(series, lookback);

                // Call the main function to process and display 6am data
                processDataAndDisplay(nonEmptyDatasets);

                loadingIndicator.style.display = 'none';
            } else {
                // console.log('No valid datasets to display.');
                loadingIndicator.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            loadingIndicator.style.display = 'none';
        });
});

function plotData(datasets, lookback) {
    console.log('datasets: ', datasets);
    console.log('lookback: ', lookback);

    // Extract unique parameter IDs for creating multiple y-axes, excluding null and undefined
    const uniqueParameterIds = [...new Set(datasets.map(item => item.parameter_id).filter(id => id != null))];
    console.log('uniqueParameterIds:', uniqueParameterIds);

    // Create a mapping for unique parameter IDs to 'y0' and 'y1'
    const parameterIdToYAxis = {};

    if (uniqueParameterIds.length === 1) {
        // If there's only one parameterId, map it to both 'y0' and 'y1'
        const parameterId = uniqueParameterIds[0];
        parameterIdToYAxis[parameterId] = 'y';
        // parameterIdToYAxis[parameterId] = 'y1'; // or choose 'y1', depending on your logic
    } else {
        // If there are two parameterIds, map them alternately to 'y0' and 'y1'
        uniqueParameterIds.forEach((id, index) => {
            parameterIdToYAxis[id] = index % 2 === 0 ? 'y0' : 'y1';
        });
    }

    // Log the entire mapping object
    // console.log('parameterIdToYAxis:', parameterIdToYAxis);

    // Apply the mapping to the datasets
    datasets.forEach(dataset => {
        dataset.yAxisID = parameterIdToYAxis[dataset.parameter_id];
    });

    // Calculate initial minY and maxY from visible datasets
    let minY, maxY;

    if (uniqueParameterIds.length === 1) {
        const initialMinMax = getInitialMinMaxY(datasets); // Implement getInitialMinMaxY function if not already defined
        minY = initialMinMax.minY;
        maxY = initialMinMax.maxY;
    } else {
        console.log("set minY and maxY for dual axis");
        const initialMinMaxDual = getInitialMinMaxYDualAxis2(datasets, uniqueParameterIds, type); // Implement getInitialMinMaxYDualAxis2 function if not already defined
        minY = initialMinMaxDual.minY;
        maxY = initialMinMaxDual.maxY;
    }

    console.log('minY:', minY);
    console.log('maxY:', maxY);

    // Create y-axes configuration dynamically if there are unique parameter IDs
    let yScales = {};

    if (uniqueParameterIds.length > 1) {
        // console.log("Dual Axis yScales");
        yScales = {
            y0: {
                min: minY.y0,
                max: maxY.y0,
                type: 'linear',
                position: 'left',
                title: {
                    display: true,
                    text: datasets.find(ds => parameterIdToYAxis[ds.parameter_id] === 'y0').parameter_id + ' (' + datasets.find(ds => parameterIdToYAxis[ds.parameter_id] === 'y0').unit_id + ')'
                }
            },
            y1: {
                min: minY.y1,
                max: maxY.y1,
                type: 'linear',
                position: 'right',
                title: {
                    display: true,
                    text: datasets.find(ds => parameterIdToYAxis[ds.parameter_id] === 'y1').parameter_id + ' (' + datasets.find(ds => parameterIdToYAxis[ds.parameter_id] === 'y1').unit_id + ')'
                }
            }
        };
    } else {
        // console.log("Single Axis yScales");
        yScales = {
            y: {
                min: minY,
                max: maxY,
                type: 'linear',
                position: 'left',
                title: {
                    display: true,
                    text: datasets[0].parameter_id + ' (' + datasets[0].unit_id + ')',
                    font: {
                        size: 14 // Set the font size for the y-axis title
                    }
                }
            }
        };
    }


    const ctx = document.getElementById('myChart').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: datasets
        },
        options: {
            scales: {
                x: {
                    type: 'time', // Assuming X-axis is a time scale
                    time: {
                        unit: 'hour',
                        stepSize: 6,
                        tooltipFormat: 'MMM D, YYYY HH:mm',
                        displayFormats: {
                            hour: 'HH:mm',
                            minute: 'HH:mm',
                        }
                    },
                    grid: {
                        display: true,
                        lineWidth: (context) => {
                            const index = context.index;
                            const ticks = context.chart.scales.x.ticks;
                            const tickIndex = context.index;

                            if (ticks && tickIndex >= 0 && tickIndex < ticks.length) {
                                const tick = ticks[tickIndex];
                                if (tick) {
                                    const tickLabel = tick.label;

                                    if (lookback <= 15) {
                                        // Apply different line widths for key times
                                        return (tickLabel === "06:00" || tickLabel === "12:00" || tickLabel === "18:00") ? 1 : 3;
                                    } else {
                                        // Use a consistent line width if lookback > 15
                                        return 1;
                                    }
                                }
                            }
                            return 1;
                        },
                        color: (context) => {
                            return 'rgba(150, 150, 150, 0.8)';
                        },
                    },
                    ticks: {
                        callback: function (value) {
                            const date = new Date(value);
                            const current_hour_utc = date.getUTCHours() === 0 ? 24 : date.getUTCHours();
                            const DaylightSavingTime = isDaylightSavingTime(date) ? 5 : 6;
                            const current_hour_cst = current_hour_utc - DaylightSavingTime;

                            // Create an array of day abbreviations
                            const dayAbbreviations = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
                            const dayOfWeek = dayAbbreviations[date.getUTCDay()]; // Get the day abbreviation

                            if (current_hour_cst === 6 || current_hour_cst === 12 || current_hour_cst === 18) {
                                return new Intl.DateTimeFormat('en-US', {
                                    hour: 'numeric',
                                    minute: 'numeric',
                                    hour12: false,
                                    timeZone: 'America/Chicago'
                                }).format(new Date(value));
                            } else if (current_hour_cst === 0) {
                                return `${dayOfWeek} ` + new Intl.DateTimeFormat('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour12: false,
                                    timeZone: 'America/Chicago',
                                }).format(new Date(value));
                            }
                        },
                        maxRotation: 90,
                        minRotation: 90,
                    },
                    title: {
                        display: true,
                        text: 'Date Time' + " " + "(" + datasets[0].time_zone + ")",
                        fontColor: 'black',
                        font: {
                            size: 14 // Set the font size for the y-axis title
                        }
                    }
                },
                ...yScales
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Cloud' + ' ' + 'Chart Macro', //'Cloud' + ' ' + datasets[0].parameter_id + ' ' + 'Plot Macro',
                    font: {
                        size: 24 // Set the font size for the title
                    }
                },
                legend: {
                    display: true,
                    onClick: function (e, legendItem, legend) {
                        // Determine if there are multiple unique parameter IDs
                        if (uniqueParameterIds.length > 1) {
                            // console.log("onClick Dual Chart");

                            const index = legendItem.datasetIndex;
                            const meta = chart.getDatasetMeta(index);
                            const dataset = chart.data.datasets[index];

                            // Toggle visibility of the clicked dataset
                            dataset.hidden = !dataset.hidden;
                            const visibleDatasets = chart.data.datasets.filter(dataset => !dataset.hidden);

                            // Recalculate min and max Y values for visible datasets
                            const { minY, maxY } = getInitialMinMaxYDualAxis2(visibleDatasets, uniqueParameterIds);

                            // Update y-axes min and max
                            Object.keys(chart.options.scales).forEach(scale => {
                                if (scale !== 'x' && minY[scale] !== undefined && maxY[scale] !== undefined) {
                                    chart.options.scales[scale].min = minY[scale];
                                    chart.options.scales[scale].max = maxY[scale];
                                }
                            });
                        } else {
                            // console.log("onClick Single Chart");

                            const index = legendItem.datasetIndex;
                            const dataset = chart.data.datasets[index];

                            // Toggle visibility of the clicked dataset
                            dataset.hidden = !dataset.hidden;

                            // Recalculate min and max Y values for all datasets
                            const { minY, maxY } = getInitialMinMaxY(chart.data.datasets);

                            // Update y-axis min and max
                            chart.options.scales.y.min = minY;
                            chart.options.scales.y.max = maxY;
                        }

                        // Update the chart after modifications
                        chart.update(datasets);
                    }
                },
                beforeUpdate: function (chart) {
                    // Check if there are multiple unique parameter IDs
                    if (uniqueParameterIds.length > 1) {
                        // console.log("beforeUpdate Dual Chart");

                        // Filter visible datasets
                        const visibleDatasets = chart.data.datasets.filter(dataset => !dataset.hidden);

                        // Recalculate min and max Y values for visible datasets
                        const { minY, maxY } = getInitialMinMaxYDualAxis2(visibleDatasets, uniqueParameterIds);

                        // Update y-axes min and max for each scale
                        Object.keys(chart.options.scales).forEach(scaleKey => {
                            if (scaleKey !== 'x' && minY[scaleKey] !== undefined && maxY[scaleKey] !== undefined) {
                                chart.options.scales[scaleKey].min = minY[scaleKey];
                                chart.options.scales[scaleKey].max = maxY[scaleKey];
                            }
                        });
                    } else {
                        // console.log("beforeUpdate Single Chart");

                        // Filter visible datasets
                        const visibleDatasets = chart.data.datasets.filter(dataset => !dataset.hidden);

                        // Recalculate min and max Y values for visible datasets
                        const { minY, maxY } = getInitialMinMaxY(visibleDatasets);

                        // Update y-axis min and max
                        chart.options.scales.y.min = minY;
                        chart.options.scales.y.max = maxY;
                    }

                    // Log the updated minY and maxY values for debugging
                    // console.log('Updated minY:', minY);
                    // console.log('Updated maxY:', maxY);
                }
            }
        }
    });
}

function isDaylightSavingTime(date) {
    const january = new Date(date.getFullYear(), 0, 1);
    const july = new Date(date.getFullYear(), 6, 1);
    const stdTimezoneOffset = Math.max(january.getTimezoneOffset(), july.getTimezoneOffset());
    return date.getTimezoneOffset() < stdTimezoneOffset;
}

function getInitialMinMaxY(datasets) {
    let minY = Infinity; // Initialize minY to the highest possible number
    let maxY = -Infinity; // Initialize maxY to the lowest possible number

    // console.log("datasets @ getInitialMinMaxY: ", datasets);

    // Log initial minY and maxY before adjustments
    // console.log('Before adjustments:');
    // console.log('Initial minY:', minY);
    // console.log('Initial maxY:', maxY);

    // Arrays to store all yValues for calculating min and max
    let allYValues = [];

    // Iterate over each dataset
    datasets.forEach((dataset, datasetIndex) => {
        if (dataset.hidden) {
            // Skip hidden datasets
            // console.log(`Dataset ${datasetIndex} is hidden, skipping...`);
            return;
        }

        // console.log(`Processing dataset ${datasetIndex}, parameter_id: ${dataset.parameter_id}`);

        // Iterate over each data point in the dataset
        dataset.data.forEach((dataPoint, dataIndex) => {
            if (dataPoint.y !== null && dataPoint.y !== undefined) {
                const yValue = parseFloat(dataPoint.y); // Parse the y value as a float
                if (!isNaN(yValue)) {
                    // Only add valid y values to the array
                    allYValues.push(yValue);
                    // console.log(`Dataset ${datasetIndex}, data point ${dataIndex}: yValue = ${yValue}`);
                } else {
                    // Log a warning if an invalid y value is encountered
                    console.warn(`Invalid yValue encountered in dataset ${datasetIndex}, data point ${dataIndex}:`, dataPoint.y);
                }
            } else {
                // Log a warning if a null or undefined y value is encountered
                console.warn(`Null or undefined yValue encountered in dataset ${datasetIndex}, data point ${dataIndex}:`, dataPoint.y);
            }
        });
    });


    // If no valid yValues found, return early with default min and max
    if (allYValues.length === 0) {
        console.error('No valid yValues found in the datasets.');
        return { minY, maxY };
    }

    // Find min and max yValues from the collected array
    const minDataY = Math.min(...allYValues);
    const maxDataY = Math.max(...allYValues);

    // console.log('minDataY:', minDataY);
    // console.log('maxDataY:', maxDataY);

    // Adjust minY and maxY based on the parameter_id and calculated minDataY and maxDataY
    if (datasets[0].parameter_id === "Stage" || datasets[0].parameter_id === "Elev") {
        // Specific adjustments for "Stage" or "Elev" parameter
        if (minDataY <= 0) {
            minY = minDataY - 1;
            maxY = maxDataY + 1;
        } else if (0 < minDataY < 900) {
            minY = minDataY - 1;
            maxY = maxDataY + 1;
        } else {
            minY = minDataY - (minDataY * 0.1);
            maxY = maxDataY + (maxDataY * 0.1);
        }
    } else if (datasets[0].parameter_id === "Flow") {
        // Specific adjustments for "Flow" parameter
        if (minDataY <= 0) {
            minY = 0;
            // console.log("Flow parameter: minDataY <= 0, setting minY to 0");
        } else if (minDataY > 0 && minDataY <= 10) {
            minY = 0;
            // console.log("Flow parameter: minDataY > 0 && minDataY <= 10, setting minY to 0");
        } else if (minDataY > 10 && minDataY <= 50) {
            minY = Math.round(minDataY) - 2;
            // console.log("Flow parameter: minDataY > 10 && minDataY <= 50, setting minY to", minY);
        } else if (minDataY > 50000) {
            minY = (Math.round(minDataY / 1000) * 1000) - 5000;
            // console.log("Flow parameter: minDataY > 50000, setting minY to", minY);
        } else if (minDataY > 100000) {
            minY = (Math.round(minDataY / 1000) * 1000) - 10000;
            // console.log("Flow parameter: minDataY > 100000, setting minY to", minY);
        } else {
            minY = minDataY - (minDataY * 0.05);
            // console.log("Flow parameter: default case, setting minY to", minY);
        }

        if (maxDataY > 0 && maxDataY <= 10) {
            maxY = Math.round(maxDataY) + 5;
            // console.log("Flow parameter: maxDataY > 0 && maxDataY <= 10, setting maxY to", maxY);
        } else if (maxDataY > 10 && maxDataY <= 50) {
            maxY = Math.round(maxDataY) + 5;
            // console.log("Flow parameter: maxDataY > 10 && maxDataY <= 50, setting maxY to", maxY);
        } else if (maxDataY > 50000) {
            maxY = (Math.round(maxDataY / 1000) * 1000) + 5000;
            // console.log("Flow parameter: maxDataY > 50000, setting maxY to", maxY);
        } else if (maxDataY > 100000) {
            maxY = (Math.round(maxDataY / 1000) * 1000) + 10000;
            // console.log("Flow parameter: maxDataY > 100000, setting maxY to", maxY);
        } else {
            maxY = maxDataY + (maxDataY * 0.05);
            // console.log("Flow parameter: default case, setting maxY to", maxY);
        }
    } else {
        // Default adjustments for other parameter_id values
        minY = minDataY - (minDataY * 0.1);
        maxY = maxDataY + (maxDataY * 0.1);
        // console.log("everything else", minY, maxY);
    }

    // Log adjusted minY and maxY after adjustments
    // console.log('After adjustments:');
    // console.log('Calculated minY:', minY);
    // console.log('Calculated maxY:', maxY);

    // Return object with calculated minY and maxY
    return { minY, maxY };
}

function subtractHoursFromDate(date, hoursToSubtract) {
    return new Date(date.getTime() - (hoursToSubtract * 60 * 60 * 1000));
}

function subtractDaysFromDate(date, daysToSubtract) {
    return new Date(date.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));
}

function addHoursFromDate(date, hoursToAdd) {
    return new Date(date.getTime() + (hoursToAdd * 60 * 60 * 1000));
}

function addDaysFromDate(date, daysToAdd) {
    return new Date(date.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const formattedDate = date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    return formattedDate;
}

function createTable(data, floodLevel) {
    // console.log("data: ", data);
    // console.log("data: ", data[0][`parameter_id`]);

    // Sort data[0].data by 'x' in descending order
    data[0].data.sort((a, b) => b.x - a.x);

    // Initialize the table structure
    let table = '<table id="gage_data"><thead><tr><th>Date Time</th><th>Value</th></tr></thead><tbody>';

    let parameter_id = data[0].parameter_id;

    // Iterate through each point in data[0].data
    data[0].data.forEach(point => {
        // Format the date based on the 'x' value
        const date = new Date(point.x).toLocaleString();

        let formattedValue = null;
        if (point.y !== null) {
            formattedValue = parameter_id === "Flow" ? point.y.toFixed(0) : point.y.toFixed(2);
        } else {
            formattedValue = 'N/A';
        }

        // Determine if the current value exceeds the flood level and should be colored red
        const exceedFloodLevel = parameter_id === "Stage" && parseFloat(formattedValue) > floodLevel;

        // Construct the table row with conditional class for text color
        table += `<tr>
                    <td>${date}</td>
                    <td style="color: ${exceedFloodLevel ? 'red' : 'inherit'}">${formattedValue}</td>
                  </tr>`;
    });

    // Close the table structure
    table += '</tbody></table>';

    // Return the complete HTML table
    return table;
}

function createTableDatman(data, floodLevel) {
    // Sort data by timestamp in descending order
    data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Initialize the table structure
    let table = '<table id="datman_data"><thead><tr><th>Date Time</th><th>Value</th></tr></thead><tbody>';

    // Iterate through each point in the filtered data
    data.forEach(point => {
        // Format the date based on the 'timestamp' value
        const date = new Date(point.timestamp).toLocaleString();

        let formattedValue = null;
        if (point.value !== null) {
            formattedValue = point.value.toFixed(2); // Formatting the value
        } else {
            formattedValue = 'N/A';
        }

        // Construct the table row
        table += `<tr>
                    <td>${date}</td>
                    <td>${formattedValue}</td>
                  </tr>`;
    });

    // Close the table structure
    table += '</tbody></table>';

    // Return the complete HTML table
    return table;
}

function createTableWithoutFloodLevel(data) {
    // console.log('data @ createTableWithoutFloodLevel: ', data);

    // Sort data[0].data by 'x' in descending order
    data[0].data.sort((a, b) => b.x - a.x);

    // Initialize the table structure
    let table = '<table id="gage_data"><thead><tr><th>Date Time</th><th>Value</th></tr></thead><tbody>';

    let parameter_id = data[0].parameter_id;
    // console.log('parameter_id @ createTableWithoutFloodLevel: ', parameter_id);

    // Iterate through each point in data[0].data
    data[0].data.forEach(point => {
        // Format the date based on the 'x' value
        const date = new Date(point.x).toLocaleString();

        let formattedValue = null;
        if (point.y !== null) {
            if (parameter_id === "Flow") {
                formattedValue = point.y.toFixed(0);
            } else {
                formattedValue = point.y.toFixed(2);
            }
        } else {
            formattedValue = 'N/A';
        }

        // Construct the table row
        table += `<tr>
                    <td>${date}</td>
                    <td>${formattedValue}</td>
                  </tr>`;
    });

    // Close the table structure
    table += '</tbody></table>';

    // Return the complete HTML table
    return table;
}

function getFloodLevel(floodLevelTimeSeries) {
    let floodLevel = null;

    // Check if floodLevelTimeSeries is not empty and the first element has a 'y' property
    if (floodLevelTimeSeries.length > 0 && floodLevelTimeSeries[0].hasOwnProperty('y')) {
        // Extract the y value from the first row
        floodLevel = floodLevelTimeSeries[0].y;

        // Check if floodLevel is null or undefined, set it to negative infinity
        if (floodLevel === null || floodLevel === undefined) {
            floodLevel = Infinity;
        }

        // Log the floodLevel value
        // console.log("floodLevel:", floodLevel); // Output: 24.999999999999996 or -Infinity if initially null/undefined
    } else {
        // console.log("floodLevelTimeSeries is empty or does not contain 'y' property in the first row.");
    }

    return floodLevel;
}

function getInitialMinMaxYDualAxis(datasets, uniqueParameterIds) {
    // console.log("getInitialMinMaxYDualAxis for dual axis");

    let minY = {
        y0: Infinity,
        y1: Infinity
    };
    let maxY = {
        y0: -Infinity,
        y1: -Infinity
    };

    // Arrays to store all yValues for each axis
    let allYValuesY0 = [];
    let allYValuesY1 = [];

    // console.log("Initial minY:", minY);
    // console.log("Initial maxY:", maxY);
    // console.log("Initial allYValuesY0:", allYValuesY0);
    // console.log("Initial allYValuesY1:", allYValuesY1);

    datasets.forEach((dataset, datasetIndex) => {
        // console.log(`Processing dataset ${datasetIndex}:`, dataset);

        if (dataset.hidden) {
            // console.log(`Dataset ${datasetIndex} is hidden, skipping.`);
            return; // Skip hidden datasets
        }

        const parameterIndex = uniqueParameterIds.indexOf(dataset.parameter_id);
        // console.log(`parameterIndex for dataset ${datasetIndex}:`, parameterIndex);

        dataset.data.forEach((dataPoint, dataPointIndex) => {
            const yValue = parseFloat(dataPoint.y);
            // console.log(`Data point ${dataPointIndex} (yValue: ${yValue}) in dataset ${datasetIndex}`);

            if (parameterIndex === 0) {
                allYValuesY0.push(yValue); // Collect yValues for y0 axis
                // console.log(`Added ${yValue} to allYValuesY0`);
            } else if (parameterIndex === 1) {
                allYValuesY1.push(yValue); // Collect yValues for y1 axis
                // console.log(`Added ${yValue} to allYValuesY1`);
            }
        });
    });

    // console.log("Final allYValuesY0:", allYValuesY0);
    // console.log("Final allYValuesY1:", allYValuesY1);

    // Find min and max yValues for y0 axis
    if (allYValuesY0.length > 0) {
        minY.y0 = Math.min(...allYValuesY0);
        maxY.y0 = Math.max(...allYValuesY0);
        // console.log('Updated minY.y0:', minY.y0);
        // console.log('Updated maxY.y0:', maxY.y0);
    }

    // Find min and max yValues for y1 axis
    if (allYValuesY1.length > 0) {
        minY.y1 = Math.min(...allYValuesY1);
        maxY.y1 = Math.max(...allYValuesY1);
        // console.log('Updated minY.y1:', minY.y1);
        // console.log('Updated maxY.y1:', maxY.y1);
    }

    // Adjust minY and maxY based on the axis-specific logic if needed

    // console.log('Final minY:', minY);
    // console.log('Final maxY:', maxY);

    // Return object with calculated minY and maxY for both y0 and y1 axes
    return { minY, maxY };
}

function displayLocationData(data, data2, versionId) {
    let verticalDatum = null;
    let elevation = null;
    if (versionId === "29") {
        verticalDatum = data["vertical-datum"];
        elevation = (data["elevation"] - data2["constant-value"]).toFixed(2);
    } else {
        verticalDatum = data["vertical-datum"];
        elevation = (data["elevation"]).toFixed(2);
    }

    const locationDataDiv = document.getElementById("gage_control_04");
    locationDataDiv.innerHTML += `Vertical Datum: ${verticalDatum}<br>Gage Zero: ${elevation} ft` + `<br>`;
}

function displayNgvd29Data(data, data2, versionId) {

    let verticalDatum = null;
    let elevation = null;
    if (versionId === "29") {
        verticalDatum = data["location-level-id"].slice(-6);
        elevation = (data["constant-value"] - data["constant-value"]).toFixed(2);
    } else {
        if (data["constant-value"] < 900) {
            verticalDatum = data["location-level-id"].slice(-6);
            elevation = (data["constant-value"]).toFixed(2);
        } else {
            verticalDatum = data["location-level-id"].slice(-6);
            elevation = "N/A";
        }
    }

    const locationDataDiv = document.getElementById("gage_control_04");
    locationDataDiv.innerHTML += `Vertical Datum: ${verticalDatum}<br>Gage Zero: ${elevation} ft`;
}

function format6AmTargetTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T06:00:00-05:00`;
}

function findValueAt6Am(datasets, targetTimeString) {
    // console.log("datasets @ findValueAt6Am ", datasets);

    // Convert target time to UTC
    const targetDate = new Date(targetTimeString);
    const targetTimeUTC = targetDate.getTime();

    // Extract parameterId from name
    const name = datasets[0]?.name; // assuming name is consistent across datasets
    const splitName = name.split('.');
    const parameterId = splitName[1];

    // Helper function to format date to 'mm-dd-yyyy hh24mi'
    function formatDate(date) {
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const yyyy = date.getFullYear();
        const hh = String(date.getHours()).padStart(2, '0');
        const mi = String(date.getMinutes()).padStart(2, '0');
        return `${mm}-${dd}-${yyyy} ${hh}${mi}`;
    }

    // Helper function to add comma as thousand separator
    function addThousandSeparator(value) {
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // Iterate through datasets to find the corresponding value
    for (let dataset of datasets) {
        if (dataset.values && dataset.values.length > 0) {
            const values = dataset.values;
            const unit_id = dataset.units;
            const result = values.find(entry => entry[0] === targetTimeUTC);
            if (result && result[1] != null) {
                const formattedTime = formatDate(targetDate);
                let valueFormatted;

                if (parameterId === "Stage" || parameterId === "Precip") {
                    valueFormatted = result[1].toFixed(2);
                } else if (parameterId === "Flow") {
                    if (result[1] > 20) {
                        valueFormatted = addThousandSeparator((Math.round(result[1] * 10) / 10).toFixed(0));
                    } else {
                        valueFormatted = addThousandSeparator(result[1].toFixed(0));
                    }
                } else {
                    valueFormatted = result[1].toFixed(2);
                }

                return `${formattedTime} = ${valueFormatted} ${unit_id}`;
            }
        }
    }

    const formattedTime = formatDate(targetDate);
    return `No value found for ${formattedTime} US/Central time.`;
}

function processDataAndDisplay(datasets) {
    // Check if there are multiple datasets
    if (datasets.length > 1) {
        document.getElementById('gage_control_03').innerHTML = "data not available for multiple time series";
        return;
    }
    // Get today's date
    const today = new Date();

    // Get yesterday's date
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Construct the target time strings for 6:00 AM US/Central time for today and yesterday
    const targetTimeStringToday = format6AmTargetTime(today);
    const targetTimeStringYesterday = format6AmTargetTime(yesterday);

    // Find values at the target times
    const valueToday = findValueAt6Am(datasets, targetTimeStringToday);
    const valueYesterday = findValueAt6Am(datasets, targetTimeStringYesterday);

    // Display the results in the <div> with id "gage_control_03"
    document.getElementById('gage_control_03').innerHTML = `
        ${valueToday}<br>
        ${valueYesterday}
    `;
}

function getInitialMinMaxYDualAxis2(datasets, uniqueParameterIds, type) {
    // console.log("datasets: ", datasets);
    // console.log("uniqueParameterIds: ", uniqueParameterIds);
    // console.log("type: ", type);

    let minY = { y0: Infinity, y1: Infinity };
    let maxY = { y0: -Infinity, y1: -Infinity };

    datasets.forEach((dataset, datasetIndex) => {
        if (!dataset.data || !Array.isArray(dataset.data)) {
            return;
        }

        dataset.data.forEach((point, pointIndex) => {
            if (typeof point.y !== 'number') {
                return;
            }

            const yAxisID = dataset.parameter_id;

            if (yAxisID === uniqueParameterIds[0]) {
                if (point.y < minY.y0) minY.y0 = point.y;
                if (point.y > maxY.y0) maxY.y0 = point.y;
            } else if (yAxisID === uniqueParameterIds[1]) {
                if (point.y < minY.y1) minY.y1 = point.y;
                if (point.y > maxY.y1) maxY.y1 = point.y;
            }
        });
    });

    // Set to null if no valid values were found
    if (minY.y0 === Infinity) minY.y0 = null;
    if (minY.y1 === Infinity) minY.y1 = null;
    if (maxY.y0 === -Infinity) maxY.y0 = null;
    if (maxY.y1 === -Infinity) maxY.y1 = null;

    // Handle type === "loading"
    if (type === "loading") {
        const globalMinY = Math.min(minY.y0 ?? Infinity, minY.y1 ?? Infinity);
        const globalMaxY = Math.max(maxY.y0 ?? -Infinity, maxY.y1 ?? -Infinity);

        minY = { y0: globalMinY - 0.5, y1: globalMinY - 0.5 };
        maxY = { y0: globalMaxY + 0.5, y1: globalMaxY + 0.5 };
    }

    console.log('Final minY:', minY);
    console.log('Final maxY:', maxY);

    return { minY, maxY };
}

function initializeBasinDropdown(basin, office) {
    if (basin !== null) {
        const basins = [
            "Mississippi",
            "Illinois",
            "Missouri",
            "Meramec",
            "Tributaries",
            "Mark Twain DO",
            "Mark Twain",
            "Wappapello",
            "Shelbyville",
            "Carlyle",
            "Rend",
            "Kaskaskia Nav",
            "Water Quality"
        ];

        const container = document.getElementById('gage_control_02');
        if (!container) {
            console.error('Container with id "gage_control_02" not found');
            return;
        }

        container.innerHTML = `
            <div class="basin-dropdown-container">
                <label for="basinDropdown" class="dropdown-label">Select a Basin</label>
                <select id="basinDropdown" class="basin-dropdown">
                    ${basins.map(item => `<option value="${item}">${item}</option>`).join('')}
                </select>
                <button id="submitButton" class="submit-button">Submit</button>
            </div>
        `;

        const dropdown = document.getElementById('basinDropdown');
        const submitButton = document.getElementById('submitButton');

        const getQueryParameter = (name) => {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(name);
        };

        const selectedBasin = getQueryParameter('basin') || basin;
        if (selectedBasin) dropdown.value = selectedBasin;

        submitButton.addEventListener('click', () => {
            const selectedBasin = dropdown.value;

            const basinMap = {
                "Mississippi": "St Louis-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev",
                "Illinois": "Meredosia-Illinois.Stage.Inst.30Minutes.0.lrgsShef-rev",
                "Missouri": "St Charles-Missouri.Stage.Inst.30Minutes.0.lrgsShef-rev",
                "Meramec": "Eureka-Meramec.Flow.Inst.30Minutes.0.RatingUSGS",
                "Tributaries": "Troy-Cuivre.Flow.Inst.15Minutes.0.RatingUSGS",
                "Mark Twain DO": "Mark Twain Lk TW-Salt.Conc-DO.Inst.15Minutes.0.lrgsShef-raw",
                "Mark Twain": "Mark Twain Lk-Salt.Stage.Inst.30Minutes.0.29",
                "Wappapello": "Wappapello Lk-St Francis.Stage.Inst.30Minutes.0.29",
                "Shelbyville": "Lk Shelbyville-Kaskaskia.Stage.Inst.30Minutes.0.29",
                "Carlyle": "Carlyle Lk-Kaskaskia.Stage.Inst.30Minutes.0.29",
                "Rend": "Rend Lk-Big Muddy.Stage.Inst.30Minutes.0.29",
                "Kaskaskia Nav": "Venedy Station-Kaskaskia.Flow.Inst.15Minutes.0.RatingUSGS",
                "Water Quality": "Mark Twain Lk TW-Salt.Conc-DO.Inst.15Minutes.0.lrgsShef-raw"
            };

            const selectedTsis = basinMap[selectedBasin] || "St Louis-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev";
            const newUrl = `?office=${office}&basin=${selectedBasin}&cwms_ts_id=${selectedTsis}`;
            window.location.href = newUrl;
        });
    }
}

function initializeBasinDropdownDataEditing(basin, office, type) {
    if (basin !== null) {
        const basins = [
            "Big Muddy",
            "Cuivre",
            "Illinois",
            "Kaskaskia",
            "Meramec",
            "Mississippi",
            "Missouri",
            "Ohio",
            "Salt",
            "St Francis"
        ];

        const container = document.getElementById('gage_control_02');
        if (!container) {
            console.error('Container with id "gage_control_02" not found');
            return;
        }

        container.innerHTML = `
            <div class="basin-dropdown-container">
                <label for="basinDropdown" class="dropdown-label">Select a Basin</label>
                <select id="basinDropdown" class="basin-dropdown">
                    ${basins.map(item => `<option value="${item}">${item}</option>`).join('')}
                </select>
                <button id="submitButton" class="submit-button">Submit</button>
            </div>
        `;

        const dropdown = document.getElementById('basinDropdown');
        const submitButton = document.getElementById('submitButton');

        const getQueryParameter = (name) => {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(name);
        };

        const selectedBasin = getQueryParameter('basin') || basin;
        if (selectedBasin) dropdown.value = selectedBasin;

        submitButton.addEventListener('click', () => {
            const selectedBasin = dropdown.value;

            const basinMap = {
                "Big Muddy": "Rend Lk-Big Muddy.Elev.Inst.30Minutes.0.lrgsShef-rev",
                "Cuivre": "Troy-Cuivre.Elev.Inst.15Minutes.0.lrgsShef-rev",
                "Illinois": "Meredosia-Illinois.Elev.Inst.30Minutes.0.lrgsShef-rev",
                "Meramec": "Eureka-Meramec.Elev.Inst.30Minutes.0.lrgsShef-rev",
                "Kaskaskia": "Venedy Station-Kaskaskia.Elev.Inst.15Minutes.0.lrgsShef-rev",
                "Missouri": "St Charles-Missouri.Elev.Inst.30Minutes.0.lrgsShef-rev",
                "Mississippi": "St Louis-Mississippi.Elev.Inst.30Minutes.0.lrgsShef-rev",
                "St Francis": "Iron Bridge-St Francis.Elev.Inst.30Minutes.0.lrgsShef-rev",
                "Salt": "Norton Bridge-Salt.Elev.Inst.15Minutes.0.lrgsShef-rev",
                "Ohio": "Cairo-Ohio.Elev.Inst.1Hour.0.lrgsShef-rev",
            };

            const selectedTsis = basinMap[selectedBasin] || "St Louis-Mississippi.Elev.Inst.30Minutes.0.lrgsShef-rev";
            const newUrl = `?office=${office}&type=${type}&basin=${selectedBasin}&cwms_ts_id=${selectedTsis}&lookback=30`;
            window.location.href = newUrl;
        });
    }
}

function initializeBasinDropdownDataLoading(basin, office, type) {
    if (basin !== null) {
        const basins = [
            "Big Muddy",
            "Cuivre",
            "Illinois",
            "Kaskaskia",
            "Meramec",
            "Mississippi",
            "Missouri",
            "Ohio",
            "Salt",
            "St Francis"
        ];

        const container = document.getElementById('gage_control_02');
        if (!container) {
            console.error('Container with id "gage_control_02" not found');
            return;
        }

        container.innerHTML = `
            <div class="basin-dropdown-container">
                <label for="basinDropdown" class="dropdown-label">Select a Basin</label>
                <select id="basinDropdown" class="basin-dropdown">
                    ${basins.map(item => `<option value="${item}">${item}</option>`).join('')}
                </select>
                <button id="submitButton" class="submit-button">Submit</button>
            </div>
        `;

        const dropdown = document.getElementById('basinDropdown');
        const submitButton = document.getElementById('submitButton');

        const getQueryParameter = (name) => {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get(name);
        };

        const selectedBasin = getQueryParameter('basin') || basin;
        if (selectedBasin) dropdown.value = selectedBasin;

        submitButton.addEventListener('click', () => {
            const selectedBasin = dropdown.value;

            const basinMap = {
                "Big Muddy": "Rend Lk-Big Muddy.Stage.Inst.30Minutes.0.29",
                "Cuivre": "Troy-Cuivre.Stage.Inst.15Minutes.0.lrgsShef-rev",
                "Illinois": "Meredosia-Illinois.Stage.Inst.30Minutes.0.lrgsShef-rev",
                "Meramec": "Eureka-Meramec.Stage.Inst.30Minutes.0.lrgsShef-rev",
                "Kaskaskia": "Venedy Station-Kaskaskia.Stage.Inst.15Minutes.0.lrgsShef-rev",
                "Missouri": "St Charles-Missouri.Stage.Inst.30Minutes.0.lrgsShef-rev",
                "Mississippi": "St Louis-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev",
                "St Francis": "Iron Bridge-St Francis.Stage.Inst.30Minutes.0.lrgsShef-rev",
                "Salt": "Norton Bridge-Salt.Stage.Inst.15Minutes.0.lrgsShef-rev",
                "Ohio": "Cairo-Ohio.Stage.Inst.1Hour.0.lrgsShef-rev",
            };

            const selectedTsis = basinMap[selectedBasin] || "St Louis-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev";
            const newUrl = `?office=${office}&type=${type}&basin=${selectedBasin}&cwms_ts_id=${selectedTsis}&lookback=30`;
            window.location.href = newUrl;
        });
    }
}

function netmissForecast(cwms_ts_id, cwms_ts_id_2) {
    // Get the container element by its ID
    const container = document.getElementById('forecast');

    if (container) {
        // Clear any existing content in the container (optional)
        container.innerHTML = '';

        // Initialize a flag to check if any case matches
        let linkCreated = false;

        // Create a link element
        const link = document.createElement('a');

        // Determine the URL based on cwms_ts_id
        switch (cwms_ts_id) {
            case "St Louis-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev":
                link.href = 'index.html?basin=Mississippi&office=MVS&cwms_ts_id=St Louis-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev&cwms_ts_id_2=St Louis-Mississippi.Stage.Inst.~1Day.0.netmiss-fcst&lookforward=4';
                linkCreated = true;
                break;
            case "Chester-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev":
                link.href = 'index.html?basin=Mississippi&office=MVS&cwms_ts_id=Chester-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev&cwms_ts_id_2=Chester-Mississippi.Stage.Inst.~1Day.0.netmiss-fcst&lookforward=4';
                linkCreated = true;
                break;
            case "Cape Girardeau-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev":
                link.href = 'index.html?basin=Mississippi&office=MVS&cwms_ts_id=Cape Girardeau-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev&cwms_ts_id_2=Cape Girardeau-Mississippi.Stage.Inst.~1Day.0.netmiss-fcst&lookforward=4';
                linkCreated = true;
                break;
            case "LD 24 TW-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev":
                link.href = 'index.html?basin=Mississippi&office=MVS&cwms_ts_id=LD 24 TW-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev&cwms_ts_id_2=LD 24 TW-Mississippi.Stage.Inst.~1Day.0.netmiss-fcst&lookforward=4';
                linkCreated = true;
                break;
            case "LD 25 TW-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev":
                link.href = 'index.html?basin=Mississippi&office=MVS&cwms_ts_id=LD 25 TW-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev&cwms_ts_id_2=LD 25 TW-Mississippi.Stage.Inst.~1Day.0.netmiss-fcst&lookforward=4';
                linkCreated = true;
                break;
            case "Mel Price TW-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev":
                link.href = 'index.html?basin=Mississippi&office=MVS&cwms_ts_id=Mel Price TW-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev&cwms_ts_id_2=Mel Price TW-Mississippi.Stage.Inst.~1Day.0.netmiss-fcst&lookforward=4';
                linkCreated = true;
                break;
            // Add more cases here if needed
            default:
                linkCreated = false;
                break;
        }

        // Only create and append the image if link was created
        if (linkCreated) {
            // Create an image element
            const img = document.createElement('img');
            img.src = 'images/forecast.png';  // Replace with the actual path to your image
            img.alt = 'Forecast Image';  // Optional: Provide an alt text for the image
            img.width = 50;
            img.height = 50;

            // Append the image to the link
            link.appendChild(img);

            // Append the link (which contains the image) to the container
            container.appendChild(link);

            // Ensure the container is visible
            container.style.display = 'block';
        } else {
            // Hide the container if no valid cwms_ts_id matched
            container.style.display = 'none';
        }
    } else {
        console.error('Container element with ID "forecast" not found.');
    }
}

function addSwitchCdaLink(office, basin, cwms_ts_id, cda) {
    // Find the div element by its ID
    const switchCdaDiv = document.getElementById('switchCda');

    // Create a new anchor (link) element
    const link = document.createElement('a');

    // Set initial text, href, and style based on the current API type
    if (cda === 'public') {
        // If on Public API, set text to switch to Internal API and background to green
        link.textContent = "Switch to Internal API";
        link.href = "index.html?" + "office=" + office + "&basin=" + basin + "&cwms_ts_id=" + cwms_ts_id + "&cda=internal";
        link.style.backgroundColor = "#4CAF50";  // Green background
    } else {
        // If on Internal API, set text to switch to Public API and background to dark blue
        link.textContent = "Switch to Public API";
        link.href = "index.html?" + "office=" + office + "&basin=" + basin + "&cwms_ts_id=" + cwms_ts_id + "&cda=public";
        link.style.backgroundColor = "darkblue";  // Dark blue background
    }

    // Apply other inline CSS to style it as a modern button
    link.style.display = "inline-block";
    link.style.padding = "10px 20px";
    link.style.color = "white";
    link.style.textAlign = "center";
    link.style.textDecoration = "none";
    link.style.borderRadius = "5px";
    link.style.fontSize = "16px";
    link.style.transition = "background-color 0.3s";
    link.style.marginBottom = "20px";  // Set margin bottom to 20px

    // Add a hover effect
    link.onmouseover = function () {
        link.style.backgroundColor = "#45a049"; // Hover effect - green color on hover
    };
    link.onmouseout = function () {
        // Reset background color based on the current API type
        link.style.backgroundColor = cda === 'public' ? "#4CAF50" : "darkblue";  // Green for Internal API, dark blue for Public API
    };

    // Add the link to the div
    switchCdaDiv.appendChild(link);
}

function updateCdaLinks(office, basin, cwms_ts_id, cda) {
    // Select all anchor tags inside div elements with the class 'lvl0 listItem'
    const anchors = document.querySelectorAll('.lvl0.listItem a');

    // Loop through each anchor and update the href
    anchors.forEach(anchor => {
        // Get the current href
        let currentHref = anchor.getAttribute('href');

        // Create a URL object to easily manipulate the query parameters
        let url = new URL(currentHref, window.location.origin);

        // Check if "index.html" exists in the path and prepend "apps/chart/"
        if (url.pathname.endsWith('index.html')) {
            url.pathname = 'apps/chart' + url.pathname;
        }

        // Create or update the search parameters
        let params = new URLSearchParams(url.search);

        // Update or append 'office', 'basin', 'cwms_ts_id', and 'cda' parameters
        if (office) params.set('office', office);
        if (basin) params.set('basin', basin);
        if (cda) {
            if (params.has('cda')) {
                params.set('cda', cda); // Update existing 'cda' parameter
            } else {
                params.append('cda', cda); // Add new 'cda' parameter if it doesn't exist
            }
        }

        // Set the updated search params and apply the new href back to the anchor
        url.search = params.toString(); // Update the search params
        anchor.setAttribute('href', url.toString()); // Set new URL to anchor
    });
}

function addSwitchTypeLink(office, basin, cwms_ts_id, cda, type, lookback) {
    // Define basinMaps for different types
    const basinMaps = {
        loading: {
            "Big Muddy": "Rend Lk-Big Muddy.Elev.Inst.30Minutes.0.lrgsShef-rev",
            "Cuivre": "Troy-Cuivre.Elev.Inst.15Minutes.0.lrgsShef-rev",
            "Illinois": "Meredosia-Illinois.Elev.Inst.30Minutes.0.lrgsShef-rev",
            "Meramec": "Eureka-Meramec.Elev.Inst.30Minutes.0.lrgsShef-rev",
            "Kaskaskia": "Venedy Station-Kaskaskia.Elev.Inst.15Minutes.0.lrgsShef-rev",
            "Missouri": "St Charles-Missouri.Elev.Inst.30Minutes.0.lrgsShef-rev",
            "Mississippi": "St Louis-Mississippi.Elev.Inst.30Minutes.0.lrgsShef-rev",
            "St Francis": "Iron Bridge-St Francis.Elev.Inst.30Minutes.0.lrgsShef-rev",
            "Salt": "Norton Bridge-Salt.Elev.Inst.15Minutes.0.lrgsShef-rev",
            "Ohio": "Cairo-Ohio.Elev.Inst.1Hour.0.lrgsShef-rev",
        },
        editing: {
            "Big Muddy": "Rend Lk-Big Muddy.Stage.Inst.30Minutes.0.29",
            "Cuivre": "Troy-Cuivre.Stage.Inst.15Minutes.0.lrgsShef-rev",
            "Illinois": "Meredosia-Illinois.Stage.Inst.30Minutes.0.lrgsShef-rev",
            "Meramec": "Eureka-Meramec.Stage.Inst.30Minutes.0.lrgsShef-rev",
            "Kaskaskia": "Venedy Station-Kaskaskia.Stage.Inst.15Minutes.0.lrgsShef-rev",
            "Missouri": "St Charles-Missouri.Stage.Inst.30Minutes.0.lrgsShef-rev",
            "Mississippi": "St Louis-Mississippi.Stage.Inst.30Minutes.0.lrgsShef-rev",
            "St Francis": "Iron Bridge-St Francis.Stage.Inst.30Minutes.0.lrgsShef-rev",
            "Salt": "Norton Bridge-Salt.Stage.Inst.15Minutes.0.lrgsShef-rev",
            "Ohio": "Cairo-Ohio.Stage.Inst.1Hour.0.lrgsShef-rev",
        }
    };

    // Get the corresponding basinMap for the current type
    const currentBasinMap = type === 'editing' ? basinMaps.editing : basinMaps.loading;

    // Update the `cwms_ts_id` based on the basin
    const updatedCwmsTsId = currentBasinMap[basin] || cwms_ts_id;

    // Find the div element by its ID
    const switchTypeDiv = document.getElementById('switchType');

    // Create a new anchor (link) element
    const link = document.createElement('a');

    // Set initial text, href, and style based on the current API type
    if (type === 'editing') {
        // If on Public API, set text to switch to Internal API and background to green
        link.textContent = "Switch to Loading";
        link.href = `index.html?office=${office}&basin=${basin}&lookback=${lookback}&cwms_ts_id=${updatedCwmsTsId}&cda=internal&type=loading`;
        link.style.backgroundColor = "#4CAF50"; // Green background
    } else {
        // If on Internal API, set text to switch to Public API and background to dark blue
        link.textContent = "Switch to Editing";
        link.href = `index.html?office=${office}&basin=${basin}&lookback=${lookback}&cwms_ts_id=${updatedCwmsTsId}&cda=internal&type=editing`;
        link.style.backgroundColor = "darkblue"; // Dark blue background
    }

    // Apply other inline CSS to style it as a modern button
    link.style.display = "inline-block";
    link.style.padding = "10px 20px";
    link.style.color = "white";
    link.style.textAlign = "center";
    link.style.textDecoration = "none";
    link.style.borderRadius = "5px";
    link.style.fontSize = "16px";
    link.style.transition = "background-color 0.3s";
    link.style.marginBottom = "20px"; // Set margin bottom to 20px

    // Add a hover effect
    link.onmouseover = function () {
        link.style.backgroundColor = "#45a049"; // Hover effect - green color on hover
    };
    link.onmouseout = function () {
        // Reset background color based on the current API type
        link.style.backgroundColor = type === 'editing' ? "#4CAF50" : "darkblue"; // Green for Internal API, dark blue for Public API
    };

    // Add the link to the div
    switchTypeDiv.appendChild(link);
}

function showDatmanLoad(type, cwms_ts_id_2, loading) {
    const datmanLoadDiv = document.getElementById("datman_load");

    if ((type === "loading" && cwms_ts_id_2 === null) || (type === "loading" && loading === "basin")) {
        datmanLoadDiv.style.display = "block"; // Show the div when loading
    } else {
        datmanLoadDiv.style.display = "none"; // Hide the div when not loading
    }
}

function formatDate(isoString) {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function displaySingleColumnTable(data) {
    const container = document.getElementById("data_table_extent");

    // Create a table element
    const table = document.createElement("table");
    table.id = "extent";

    // Add rows for each required field
    const rows = [
        { label: "Office", value: data.office },
        { label: "Name", value: data.name },
        { label: "Earliest Time", value: formatDate(data.extents[0]["earliest-time"]) },
        { label: "Latest Time", value: formatDate(data.extents[0]["latest-time"]) } // Format Latest Time
    ];

    rows.forEach(rowData => {
        // Add the label row (th)
        const labelRow = document.createElement("tr");
        const labelCell = document.createElement("th");
        labelCell.textContent = rowData.label;
        labelRow.appendChild(labelCell);
        table.appendChild(labelRow);

        // Add the value row (td)
        const valueRow = document.createElement("tr");
        const valueCell = document.createElement("td");
        valueCell.textContent = rowData.value;
        valueRow.appendChild(valueCell);
        table.appendChild(valueRow);
    });

    // Append the table to the container
    container.appendChild(table);
}

function processDatmanPayload(datmanPayload, match) {
    if (!match || !datmanPayload || !datmanPayload.values) {
        throw new Error("Invalid input: match or datmanPayload is missing or malformed.");
    }

    const tscode = match.tscode;

    // Helper function to format a timestamp into a Date object
    const formatDate = (timestamp) => {
        return new Date(timestamp); // Convert timestamp to Date object
    };

    // Helper function to format date into 'dd-MMM-yyyy hh24:mi' in UTC
    const formatDateStringWithTimeUTC = (date) => {
        const day = date.getUTCDate().toString().padStart(2, '0'); // Ensure 2-digit day
        const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(); // Get month in uppercase
        const year = date.getUTCFullYear().toString(); // Full 4-digit year
        const hours = date.getUTCHours().toString().padStart(2, '0'); // 24-hour format
        const minutes = date.getUTCMinutes().toString().padStart(2, '0'); // 2-digit minutes

        return `${day}-${month}-${year} ${hours}:${minutes}`;
    };

    // Helper function to get the current date in UTC and format it as 'dd-MMM-yyyy hh24:mi'
    const getUTCDateWithTime = () => {
        const now = new Date();
        return formatDateStringWithTimeUTC(now);
    };

    const fixedDateWithTimeUTC = getUTCDateWithTime();

    // Prepend tscode and convert timestamps to formatted date strings with UTC time
    datmanPayload.values = datmanPayload.values.map(([timestamp, ...rest]) => {
        const formattedDate = formatDate(timestamp); // Parse timestamp into Date object
        const formattedDateStrWithTimeUTC = formatDateStringWithTimeUTC(formattedDate); // Format in UTC
        return [tscode, fixedDateWithTimeUTC, formattedDateStrWithTimeUTC, ...rest, null, null];
    });

    return datmanPayload;
}

function processDatmanPayloadWithoutMatch(datmanPayloads) {
    if (!Array.isArray(datmanPayloads) || datmanPayloads.length === 0) {
        throw new Error("Invalid input: datmanPayloads must be a non-empty array.");
    }

    // Helper function to format a timestamp into a Date object
    const formatDate = (timestamp) => {
        return new Date(timestamp); // Convert timestamp to Date object
    };

    // Helper function to format date into 'dd-MMM-yyyy hh24:mi' in UTC
    const formatDateStringWithTimeUTC = (date) => {
        const day = date.getUTCDate().toString().padStart(2, '0'); // Ensure 2-digit day
        const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(); // Get month in uppercase
        const year = date.getUTCFullYear().toString(); // Full 4-digit year
        const hours = date.getUTCHours().toString().padStart(2, '0'); // 24-hour format
        const minutes = date.getUTCMinutes().toString().padStart(2, '0'); // 2-digit minutes

        return `${day}-${month}-${year} ${hours}:${minutes}`;
    };

    // Helper function to get the current date in UTC and format it as 'dd-MMM-yyyy hh24:mi'
    const getUTCDateWithTime = () => {
        const now = new Date();
        return formatDateStringWithTimeUTC(now);
    };

    const fixedDateWithTimeUTC = getUTCDateWithTime();

    // Process each payload
    return datmanPayloads.map(payload => {
        if (!payload.values || !payload.tscode) {
            throw new Error("Invalid payload: missing values or tscode.");
        }

        // Prepend tscode and convert timestamps to formatted date strings with UTC time
        const updatedValues = payload.values.map(([timestamp, ...rest]) => {
            const formattedDate = formatDate(timestamp); // Parse timestamp into Date object
            const formattedDateStrWithTimeUTC = formatDateStringWithTimeUTC(formattedDate); // Format in UTC
            return [payload.tscode, fixedDateWithTimeUTC, formattedDateStrWithTimeUTC, ...rest, null, null];
        });

        // Return the updated payload
        return {
            ...payload,
            values: updatedValues
        };
    });
}