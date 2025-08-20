let currentDocuments = [];
let chartInstances = [];
let performanceData = [];
let showCharts = true;
let darkMode = false;
let analyticsData = {};

document.getElementById('fileInput').addEventListener('change', handleFileUpload);
document.getElementById('searchBox').addEventListener('input', handleSearch);

function handleFileUpload(event) {
    const files = event.target.files;
    if (!files.length) return;

    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    Array.from(files).forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.innerHTML = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        fileList.appendChild(fileItem);

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const xmlContent = e.target.result;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

                if (xmlDoc.documentElement.nodeName === 'parsererror') {
                    throw new Error('Invalid XML format');
                }

                currentDocuments.push({
                    name: file.name,
                    doc: xmlDoc,
                    processed: false
                });

                if (index === 0) {
                    processStratMLDocument(xmlDoc, file.name);
                    document.getElementById('documentViewer').classList.remove('hidden');
                    document.getElementById('documentViewer').classList.add('fade-in');
                }

                showNotification(`Successfully loaded ${file.name}`, 'success');
            } catch (error) {
                showNotification(`Error parsing ${file.name}: ${error.message}`, 'error');
            }
        };
        reader.readAsText(file);
    });
}

function processStratMLDocument(xmlDoc, fileName = 'Document') {
    const content = document.getElementById('documentContent');
    const tocList = document.getElementById('tocList');

    content.innerHTML = '';
    tocList.innerHTML = '';

    const stratPlan = xmlDoc.querySelector('StrategicPlan') || xmlDoc.querySelector('PerformancePlan') || xmlDoc.querySelector('PerformanceReport');
    if (!stratPlan) {
        content.innerHTML = '<p>❌ No StratML content found in the document.</p>';
        return;
    }

    const documentInfo = extractDocumentInfo(stratPlan);
    analyticsData = initializeAnalytics();

    let html = createDocumentHeader(documentInfo);
    html += createVisionMissionSection(stratPlan);
    html += createValuesSection(stratPlan);
    html += createGoalsSection(stratPlan);
    html += createStakeholdersSection(stratPlan);

    content.innerHTML = html;

    generateTableOfContents(tocList);
    calculateAnalytics();

    setTimeout(() => {
        if (showCharts) {
            initializeAllCharts();
        }
        addInteractiveFeatures();
    }, 200);
}

function extractDocumentInfo(stratPlan) {
    return {
        name: getElementText(stratPlan, 'Name') || 'Strategic Plan',
        description: getElementText(stratPlan, 'Description'),
        startDate: getElementText(stratPlan, 'StartDate'),
        endDate: getElementText(stratPlan, 'EndDate'),
        version: stratPlan.getAttribute('Version') || '1.0',
        organization: getElementText(stratPlan, 'Organization') || getElementText(stratPlan, 'OrganizationName'),
        submitter: getElementText(stratPlan, 'Submitter'),
        publicationDate: getElementText(stratPlan, 'PublicationDate')
    };
}

function createDocumentHeader(info) {
    return `
        <div class="section fade-in" id="document-info">
            <h2>📋 ${info.name}</h2>
            <div class="indicator-meta">
                ${info.organization ? `<div class="meta-item">
                    <div class="meta-label">Organization</div>
                    <div class="meta-value">${info.organization}</div>
                </div>` : ''}
                ${info.startDate || info.endDate ? `<div class="meta-item">
                    <div class="meta-label">Period</div>
                    <div class="meta-value">${info.startDate || 'N/A'} - ${info.endDate || 'N/A'}</div>
                </div>` : ''}
                ${info.version ? `<div class="meta-item">
                    <div class="meta-label">Version</div>
                    <div class="meta-value">${info.version}</div>
                </div>` : ''}
                ${info.publicationDate ? `<div class="meta-item">
                    <div class="meta-label">Published</div>
                    <div class="meta-value">${formatDate(info.publicationDate)}</div>
                </div>` : ''}
            </div>
            ${info.description ? `<p class="section-description">${info.description}</p>` : ''}
        </div>
    `;
}

function createVisionMissionSection(stratPlan) {
    let html = '';

    const visionStatement = stratPlan.querySelector('VisionStatement');
    if (visionStatement) {
        const visionText = getElementText(visionStatement, 'Description');
        html += `
            <div class="section fade-in" id="vision">
                <h2>🌟 Vision Statement</h2>
                <div class="subsection">
                    <p class="vision-text">${visionText}</p>
                </div>
            </div>
        `;
    }

    const missionStatement = stratPlan.querySelector('MissionStatement');
    if (missionStatement) {
        const missionText = getElementText(missionStatement, 'Description');
        html += `
            <div class="section fade-in" id="mission">
                <h2>🎯 Mission Statement</h2>
                <div class="subsection">
                    <p class="mission-text">${missionText}</p>
                </div>
            </div>
        `;
    }

    return html;
}

function createValuesSection(stratPlan) {
    const values = stratPlan.querySelectorAll('Value');
    if (values.length === 0) return '';

    let html = `<div class="section fade-in" id="values">
        <h2>💎 Core Values</h2>`;

    values.forEach((value, index) => {
        const valueName = getElementText(value, 'Name');
        const valueDesc = getElementText(value, 'Description');
        html += `
            <div class="subsection slide-up" style="animation-delay: ${index * 0.1}s">
                <h3>${valueName}</h3>
                ${valueDesc ? `<p>${valueDesc}</p>` : ''}
            </div>
        `;
    });

    html += '</div>';
    return html;
}

function createGoalsSection(stratPlan) {
    const goals = stratPlan.querySelectorAll('Goal');
    if (goals.length === 0) return '';

    let html = '';

    goals.forEach((goal, goalIndex) => {
        const goalName = getElementText(goal, 'Name');
        const goalDesc = getElementText(goal, 'Description');
        const goalId = `goal-${goalIndex}`;

        analyticsData.totalGoals++;

        html += `
            <div class="section fade-in" id="${goalId}" style="animation-delay: ${goalIndex * 0.2}s">
                <h2>🎯 Goal ${goalIndex + 1}: ${goalName}</h2>
                ${goalDesc ? `<p class="goal-description">${goalDesc}</p>` : ''}
        `;

        const objectives = goal.querySelectorAll('Objective');
        objectives.forEach((objective, objIndex) => {
            const objName = getElementText(objective, 'Name');
            const objDesc = getElementText(objective, 'Description');
            const objId = `obj-${goalIndex}-${objIndex}`;

            analyticsData.totalObjectives++;

            html += `
                <div class="subsection slide-up" id="${objId}" style="animation-delay: ${(objIndex * 0.1)}s">
                    <h3>📌 Objective ${objIndex + 1}: ${objName}</h3>
                    ${objDesc ? `<p>${objDesc}</p>` : ''}
            `;

            const indicators = objective.querySelectorAll('PerformanceIndicator');
            if (indicators.length > 0) {
                html += processPerformanceIndicators(indicators, `${goalIndex}-${objIndex}`);
            }

            html += '</div>';
        });

        html += '</div>';
    });

    return html;
}

function createStakeholdersSection(stratPlan) {
    const stakeholders = stratPlan.querySelectorAll('Stakeholder');
    if (stakeholders.length === 0) return '';

    let html = `
        <div class="section fade-in" id="stakeholders">
            <h2>👥 Stakeholders</h2>
            <div class="stakeholders-grid">
    `;

    stakeholders.forEach((stakeholder, index) => {
        const name = getElementText(stakeholder, 'Name');
        const role = getElementText(stakeholder, 'Role') || stakeholder.getAttribute('Role') || stakeholder.getAttribute('RoleType');
        const email = getElementText(stakeholder, 'EmailAddress');
        const phone = getElementText(stakeholder, 'PhoneNumber');
        const organization = getElementText(stakeholder, 'OrganizationName');

        const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
        const roleIcon = getRoleIcon(role);

        html += `
            <div class="stakeholder slide-up" style="animation-delay: ${index * 0.1}s">
                <div class="stakeholder-avatar">${initials}</div>
                <div class="stakeholder-info">
                    <h4>${roleIcon} ${name || 'Unnamed Stakeholder'}</h4>
                    ${role ? `<p><strong>Role:</strong> ${role}</p>` : ''}
                    ${organization ? `<p><strong>Organization:</strong> ${organization}</p>` : ''}
                    ${email ? `<p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>` : ''}
                    ${phone ? `<p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>` : ''}
                </div>
            </div>
        `;
    });

    html += '</div></div>';
    return html;
}

function processPerformanceIndicators(indicators, prefix) {
    let html = '<div class="performance-indicators">';

    indicators.forEach((indicator, index) => {
        const indName = getElementText(indicator, 'Name');
        const indDesc = getElementText(indicator, 'Description');
        const indType = indicator.getAttribute('Type') || 'Quantitative';
        const indUnit = getElementText(indicator, 'UnitOfMeasurement');
        const indId = `indicator-${prefix}-${index}`;

        analyticsData.totalIndicators++;

        html += `
            <div class="performance-indicator pulse" id="${indId}">
                <div class="indicator-header">
                    <div class="indicator-title">
                        📊 ${indName}
                        <span class="indicator-badge">${indType}</span>
                    </div>
                    <div class="view-controls">
                        <button class="view-toggle" onclick="toggleIndicatorView('${indId}')">📊 Chart View</button>
                        <button class="trend-btn" onclick="showTrendAnalysis('${indId}')">📈 Trends</button>
                        <button class="download-btn" onclick="downloadIndicatorData('${indId}')">💾 Export</button>
                    </div>
                </div>
                
                <div class="indicator-meta">
                    ${indDesc ? `<div class="meta-item">
                        <div class="meta-label">Description</div>
                        <div class="meta-value">${indDesc}</div>
                    </div>` : ''}
                    ${indUnit ? `<div class="meta-item">
                        <div class="meta-label">Unit</div>
                        <div class="meta-value">${indUnit}</div>
                    </div>` : ''}
                    <div class="meta-item">
                        <div class="meta-label">Type</div>
                        <div class="meta-value">${indType}</div>
                    </div>
                </div>
        `;

        const measurements = indicator.querySelectorAll('PerformanceMeasurement');
        if (measurements.length > 0) {
            html += processPerformanceMeasurements(measurements, indId, indType, indUnit);
        } else {
            const targetValue = getElementText(indicator, 'TargetValue');
            const actualValue = getElementText(indicator, 'ActualValue');

            if (targetValue || actualValue) {
                html += createSingleMeasurementDisplay(targetValue, actualValue, indId, indType, indUnit);
            }
        }

        html += '</div>';
    });

    html += '</div>';
    return html;
}

function processPerformanceMeasurements(measurements, indId, indType, indUnit) {
    let html = '<div class="measurements">';
    const data = [];
    let totalPerformance = 0;
    let measurementCount = 0;

    measurements.forEach((measurement, index) => {
        const targetValue = getElementText(measurement, 'TargetValue');
        const actualValue = getElementText(measurement, 'ActualValue');
        const date = getElementText(measurement, 'MeasurementDate');
        const period = getElementText(measurement, 'ReportingPeriod');

        if (targetValue && actualValue) {
            const target = parseFloat(targetValue) || 0;
            const actual = parseFloat(actualValue) || 0;
            const variance = actual - target;
            const variancePercent = target !== 0 ? ((variance / target) * 100) : 0;
            const performance = target !== 0 ? ((actual / target) * 100) : 0;

            totalPerformance += performance;
            measurementCount++;

            data.push({
                date: date || period || `Period ${index + 1}`,
                target: target,
                actual: actual,
                variance: variance,
                variancePercent: variancePercent,
                performance: performance
            });

            const performanceStatus = getPerformanceStatus(performance);
            updateAnalyticsCounters(performanceStatus);

            html += `
                <div class="measurement slide-up" style="animation-delay: ${index * 0.1}s">
                    <h4>📅 ${date || period || `Measurement ${index + 1}`}</h4>
                    <div class="indicator-data">
                        <div class="data-point target">
                            <div class="data-label">🎯 Target</div>
                            <div class="data-value">${formatValue(targetValue, indUnit)}</div>
                        </div>
                        <div class="data-point actual">
                            <div class="data-label">📈 Actual</div>
                            <div class="data-value">${formatValue(actualValue, indUnit)}</div>
                            <div class="data-trend ${performance >= 100 ? 'trend-up' : 'trend-down'}">
                                ${performance >= 100 ? '⬆️' : '⬇️'} ${performance.toFixed(1)}%
                            </div>
                        </div>
                        <div class="data-point variance ${variance >= 0 ? 'positive' : 'negative'}">
                            <div class="data-label">📊 Variance</div>
                            <div class="data-value">${variance >= 0 ? '+' : ''}${formatValue(variance.toFixed(2), indUnit)}</div>
                            <div class="status-indicator ${performanceStatus.class}">${performanceStatus.icon} ${performanceStatus.label}</div>
                        </div>
                    </div>
                    ${createAdvancedProgressBar(actual, target, performance)}
                </div>
            `;
        }
    });

    if (data.length > 0) {
        html += `
            <div class="chart-container" id="chart-${indId}" style="display: none;">
                <div class="chart-tabs">
                    <button class="chart-tab active" onclick="switchChart('${indId}', 'line')">📈 Trend</button>
                    <button class="chart-tab" onclick="switchChart('${indId}', 'bar')">📊 Comparison</button>
                    <button class="chart-tab" onclick="switchChart('${indId}', 'radar')">🎯 Performance</button>
                </div>
                <canvas id="canvas-${indId}"></canvas>
            </div>
        `;
    }

    html += '</div>';

    if (data.length > 0) {
        window[`chartData_${indId}`] = data;
        if (measurementCount > 0) {
            const avgPerformance = totalPerformance / measurementCount;
            performanceData.push({
                id: indId,
                name: indId.replace(/indicator-/, '').replace(/-/g, ' '),
                performance: avgPerformance,
                data: data
            });
        }
    }

    return html;
}

function createSingleMeasurementDisplay(targetValue, actualValue, indId, indType, indUnit) {
    const target = parseFloat(targetValue) || 0;
    const actual = parseFloat(actualValue) || 0;
    const variance = actual - target;
    const performance = target !== 0 ? ((actual / target) * 100) : 0;

    const performanceStatus = getPerformanceStatus(performance);
    updateAnalyticsCounters(performanceStatus);

    let html = `
        <div class="indicator-data">
            <div class="data-point target">
                <div class="data-label">🎯 Target</div>
                <div class="data-value">${formatValue(targetValue, indUnit)}</div>
            </div>
            <div class="data-point actual">
                <div class="data-label">📈 Actual</div>
                <div class="data-value">${formatValue(actualValue, indUnit)}</div>
                <div class="data-trend ${performance >= 100 ? 'trend-up' : 'trend-down'}">
                    ${performance >= 100 ? '⬆️' : '⬇️'} ${performance.toFixed(1)}%
                </div>
            </div>
            <div class="data-point variance ${variance >= 0 ? 'positive' : 'negative'}">
                <div class="data-label">📊 Variance</div>
                <div class="data-value">${variance >= 0 ? '+' : ''}${formatValue(variance.toFixed(2), indUnit)}</div>
                <div class="status-indicator ${performanceStatus.class}">${performanceStatus.icon} ${performanceStatus.label}</div>
            </div>
        </div>
        ${createAdvancedProgressBar(actual, target, performance)}
    `;

    if (targetValue && actualValue) {
        html += `
            <div class="chart-container" id="chart-${indId}" style="display: none;">
                <div class="chart-tabs">
                    <button class="chart-tab active" onclick="switchChart('${indId}', 'doughnut')">🍩 Achievement</button>
                    <button class="chart-tab" onclick="switchChart('${indId}', 'gauge')">⚡ Performance</button>
                </div>
                <canvas id="canvas-${indId}"></canvas>
            </div>
        `;

        window[`chartData_${indId}`] = [{
            date: 'Current',
            target: target,
            actual: actual,
            variance: variance,
            performance: performance
        }];

        performanceData.push({
            id: indId,
            name: indId.replace(/indicator-/, '').replace(/-/g, ' '),
            performance: performance,
            data: [{
                date: 'Current',
                target: target,
                actual: actual,
                variance: variance,
                performance: performance
            }]
        });
    }

    return html;
}

function createAdvancedProgressBar(actual, target, performance) {
    if (!target || target === 0) return '';

    const percentage = Math.min(performance, 150);
    const status = getPerformanceStatus(performance);

    return `
        <div class="progress-container">
            <div class="progress-header">
                <span><strong>Progress:</strong> ${formatValue(actual)} / ${formatValue(target)}</span>
                <span class="status-indicator ${status.class}">${status.icon} ${status.label}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill ${status.progressClass}" style="width: ${Math.min(percentage, 100)}%">
                    <div class="progress-text">${percentage.toFixed(1)}%</div>
                </div>
            </div>
        </div>
    `;
}

function getPerformanceStatus(performance) {
    if (performance >= 100) {
        return {
            class: 'status-excellent',
            progressClass: '',
            icon: '🎉',
            label: 'Excellent'
        };
    } else if (performance >= 80) {
        return {
            class: 'status-good',
            progressClass: '',
            icon: '✅',
            label: 'Good'
        };
    } else if (performance >= 60) {
        return {
            class: 'status-warning',
            progressClass: 'warning',
            icon: '⚠️',
            label: 'At Risk'
        };
    } else {
        return {
            class: 'status-danger',
            progressClass: 'over',
            icon: '❌',
            label: 'Critical'
        };
    }
}

function updateAnalyticsCounters(status) {
    if (status.label === 'Excellent' || status.label === 'Good') {
        analyticsData.onTrackCount++;
    } else {
        analyticsData.atRiskCount++;
    }
}

function initializeAnalytics() {
    return {
        totalGoals: 0,
        totalObjectives: 0,
        totalIndicators: 0,
        onTrackCount: 0,
        atRiskCount: 0,
        avgPerformance: 0
    };
}

function calculateAnalytics() {
    if (performanceData.length > 0) {
        const totalPerformance = performanceData.reduce((sum, item) => sum + item.performance, 0);
        analyticsData.avgPerformance = totalPerformance / performanceData.length;
    }
}

function generateTableOfContents(tocList) {
    const sections = document.querySelectorAll('.section[id]');
    let tocHTML = '';

    sections.forEach(section => {
        const title = section.querySelector('h2').textContent;
        const id = section.id;

        tocHTML += `<li><a href="#${id}">${title}</a>`;

        const subsections = section.querySelectorAll('.subsection[id]');
        if (subsections.length > 0) {
            tocHTML += '<ul class="sub-items">';
            subsections.forEach(subsection => {
                const subTitle = subsection.querySelector('h3').textContent;
                const subId = subsection.id;
                tocHTML += `<li><a href="#${subId}">${subTitle}</a></li>`;
            });
            tocHTML += '</ul>';
        }

        tocHTML += '</li>';
    });

    tocList.innerHTML = tocHTML;

    tocList.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                targetElement.style.transform = 'scale(1.02)';
                targetElement.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.3)';
                setTimeout(() => {
                    targetElement.style.transform = '';
                    targetElement.style.boxShadow = '';
                }, 1000);
            }
        });
    });
}

function initializeAllCharts() {
    const chartContainers = document.querySelectorAll('.chart-container[id^="chart-"]');

    chartContainers.forEach(container => {
        const indId = container.id.replace('chart-', '');
        const canvasId = `canvas-${indId}`;
        const canvas = document.getElementById(canvasId);
        const data = window[`chartData_${indId}`];

        if (canvas && data && data.length > 0) {
            createAdvancedChart(canvas, data, indId);
        }
    });
}

function createAdvancedChart(canvas, data, indId) {
    const ctx = canvas.getContext('2d');

    let chartConfig;
    const chartType = data.length > 1 ? 'line' : 'doughnut';

    if (chartType === 'line') {
        chartConfig = createLineChart(data);
    } else {
        chartConfig = createDoughnutChart(data[0]);
    }

    const chart = new Chart(ctx, chartConfig);
    chartInstances.push({ id: indId, instance: chart, type: chartType });
}

function createLineChart(data) {
    return {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [
                {
                    label: '🎯 Target',
                    data: data.map(d => d.target),
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#007bff',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                },
                {
                    label: '📈 Actual',
                    data: data.map(d => d.actual),
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#28a745',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '📊 Performance Trend Analysis',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: { usePointStyle: true, padding: 20 }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#667eea',
                    borderWidth: 2,
                    callbacks: {
                        afterLabel: function (context) {
                            const dataIndex = context.dataIndex;
                            const performance = data[dataIndex].performance;
                            return `Performance: ${performance.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Value',
                        font: { weight: 'bold' }
                    },
                    grid: { color: 'rgba(0,0,0,0.1)' }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time Period',
                        font: { weight: 'bold' }
                    },
                    grid: { color: 'rgba(0,0,0,0.1)' }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            }
        }
    };
}

function createDoughnutChart(dataPoint) {
    const performance = dataPoint.performance;
    const remaining = Math.max(0, 100 - performance);

    return {
        type: 'doughnut',
        data: {
            labels: ['Achieved', 'Remaining'],
            datasets: [{
                data: [Math.min(performance, 100), remaining],
                backgroundColor: [
                    performance >= 100 ? '#28a745' : performance >= 80 ? '#20c997' : performance >= 60 ? '#ffc107' : '#dc3545',
                    '#e9ecef'
                ],
                borderWidth: 0,
                cutout: '70%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '🎯 Achievement Rate',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, padding: 20 }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    callbacks: {
                        label: function (context) {
                            return `${context.label}: ${context.parsed.toFixed(1)}%`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                duration: 2000
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: function (chart) {
                const ctx = chart.ctx;
                ctx.save();
                ctx.font = 'bold 24px Inter';
                ctx.fillStyle = performance >= 80 ? '#28a745' : performance >= 60 ? '#ffc107' : '#dc3545';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
                ctx.fillText(`${performance.toFixed(1)}%`, centerX, centerY);
                ctx.restore();
            }
        }]
    };
}

function switchChart(indId, chartType) {
    const chartInstance = chartInstances.find(c => c.id === indId);
    if (!chartInstance) return;

    const data = window[`chartData_${indId}`];
    if (!data) return;

    chartInstance.instance.destroy();

    const canvas = document.getElementById(`canvas-${indId}`);
    const ctx = canvas.getContext('2d');

    let newConfig;

    switch (chartType) {
        case 'line':
            newConfig = createLineChart(data);
            break;
        case 'bar':
            newConfig = createBarChart(data);
            break;
        case 'radar':
            newConfig = createRadarChart(data);
            break;
        case 'doughnut':
            newConfig = createDoughnutChart(data[0]);
            break;
        case 'gauge':
            newConfig = createGaugeChart(data[0]);
            break;
        default:
            newConfig = createLineChart(data);
    }

    const newChart = new Chart(ctx, newConfig);
    chartInstance.instance = newChart;
    chartInstance.type = chartType;

    const container = document.getElementById(`chart-${indId}`);
    const tabs = container.querySelectorAll('.chart-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
}

function createBarChart(data) {
    return {
        type: 'bar',
        data: {
            labels: data.map(d => d.date),
            datasets: [
                {
                    label: '🎯 Target',
                    data: data.map(d => d.target),
                    backgroundColor: 'rgba(0, 123, 255, 0.8)',
                    borderColor: '#007bff',
                    borderWidth: 2
                },
                {
                    label: '📈 Actual',
                    data: data.map(d => d.actual),
                    backgroundColor: 'rgba(40, 167, 69, 0.8)',
                    borderColor: '#28a745',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '📊 Target vs Actual Comparison',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: { beginAtZero: true },
                x: { grid: { display: false } }
            },
            animation: { duration: 1500 }
        }
    };
}

function createRadarChart(data) {
    const latestData = data[data.length - 1];
    const performance = latestData.performance;

    return {
        type: 'radar',
        data: {
            labels: ['Achievement', 'Consistency', 'Efficiency', 'Quality', 'Timeliness'],
            datasets: [{
                label: 'Performance Score',
                data: [
                    performance,
                    Math.min(performance * 0.9, 100),
                    Math.min(performance * 0.95, 100),
                    Math.min(performance * 0.92, 100),
                    Math.min(performance * 0.88, 100)
                ],
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: '#667eea',
                borderWidth: 3,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '🎯 Multi-Dimensional Performance',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            },
            animation: { duration: 2000 }
        }
    };
}

function toggleIndicatorView(indId) {
    const chartContainer = document.getElementById(`chart-${indId}`);
    const button = document.querySelector(`#${indId} .view-toggle`);

    if (chartContainer.style.display === 'none') {
        chartContainer.style.display = 'block';
        button.textContent = '📋 Table View';
        button.innerHTML = '📋 Table View';

        if (!chartInstances.find(c => c.id === indId)) {
            const canvas = document.getElementById(`canvas-${indId}`);
            const data = window[`chartData_${indId}`];
            if (canvas && data) {
                createAdvancedChart(canvas, data, indId);
            }
        }
    } else {
        chartContainer.style.display = 'none';
        button.textContent = '📊 Chart View';
        button.innerHTML = '📊 Chart View';
    }
}

function showTrendAnalysis(indId) {
    const data = window[`chartData_${indId}`];
    if (!data || data.length < 2) {
        showNotification('Insufficient data for trend analysis', 'info');
        return;
    }

    let trendAnalysis = analyzeTrend(data);
    showNotification(`Trend: ${trendAnalysis}`, 'info');
}

function analyzeTrend(data) {
    if (data.length < 2) return 'Insufficient data';

    const performances = data.map(d => d.performance);
    const trend = performances[performances.length - 1] - performances[0];
    const avgChange = trend / (performances.length - 1);

    if (avgChange > 5) return '📈 Strong upward trend';
    if (avgChange > 1) return '📊 Moderate upward trend';
    if (avgChange < -5) return '📉 Strong downward trend';
    if (avgChange < -1) return '📊 Moderate downward trend';
    return '📊 Stable performance';
}

function downloadIndicatorData(indId) {
    const data = window[`chartData_${indId}`];
    if (!data) {
        showNotification('No data available for download', 'error');
        return;
    }

    const csv = convertToCSV(data);
    downloadCSV(csv, `indicator-${indId}-data.csv`);
    showNotification('Data downloaded successfully', 'success');
}

function convertToCSV(data) {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    return headers + '\n' + rows;
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function toggleCharts() {
    showCharts = !showCharts;
    const button = document.querySelector('.chart-toggle');

    if (showCharts) {
        button.innerHTML = '📊 Hide Charts';
        document.querySelectorAll('.chart-container').forEach(container => {
            container.style.display = 'block';
        });
        setTimeout(() => initializeAllCharts(), 100);
    } else {
        button.innerHTML = '📊 Show Charts';
        document.querySelectorAll('.chart-container').forEach(container => {
            container.style.display = 'none';
        });
        chartInstances.forEach(chart => {
            if (chart.instance) chart.instance.destroy();
        });
        chartInstances = [];
    }
}

function toggleTheme() {
    darkMode = !darkMode;
    const button = document.querySelector('.theme-toggle');

    if (darkMode) {
        document.body.classList.add('dark-theme');
        button.innerHTML = '☀️ Light Mode';
    } else {
        document.body.classList.remove('dark-theme');
        button.innerHTML = '🌙 Dark Mode';
    }

    chartInstances.forEach(chart => {
        if (chart.instance) {
            chart.instance.destroy();
        }
    });
    chartInstances = [];

    setTimeout(() => {
        if (showCharts) initializeAllCharts();
    }, 100);
}

function showAnalytics() {
    updateAnalyticsDisplay();
    document.getElementById('analyticsModal').style.display = 'block';

    setTimeout(() => {
        createAnalyticsChart();
    }, 200);
}

function updateAnalyticsDisplay() {
    document.getElementById('totalGoals').textContent = analyticsData.totalGoals;
    document.getElementById('totalObjectives').textContent = analyticsData.totalObjectives;
    document.getElementById('totalIndicators').textContent = analyticsData.totalIndicators;
    document.getElementById('avgPerformance').textContent = `${analyticsData.avgPerformance.toFixed(1)}%`;
    document.getElementById('onTrackCount').textContent = analyticsData.onTrackCount;
    document.getElementById('riskCount').textContent = analyticsData.atRiskCount;
}

function createAnalyticsChart() {
    const canvas = document.getElementById('analyticsChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const statusData = [
        analyticsData.onTrackCount,
        analyticsData.atRiskCount
    ];

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['On Track', 'At Risk'],
            datasets: [{
                data: statusData,
                backgroundColor: ['#28a745', '#dc3545'],
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '📊 Overall Performance Status',
                    font: { size: 18, weight: 'bold' }
                },
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, usePointStyle: true }
                }
            },
            animation: { duration: 2000 }
        }
    });
}

function exportData() {
    if (currentDocuments.length === 0) {
        showNotification('No document loaded to export', 'error');
        return;
    }

    const exportData = {
        metadata: {
            exportDate: new Date().toISOString(),
            documentCount: currentDocuments.length,
            version: '2.0'
        },
        analytics: analyticsData,
        performance: performanceData,
        documents: currentDocuments.map(doc => ({
            name: doc.name,
            processed: doc.processed
        }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `stratml-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Data exported successfully', 'success');
}

function generateReport() {
    if (currentDocuments.length === 0) {
        showNotification('No document loaded to generate report', 'error');
        return;
    }

    const reportContent = createReportHTML();
    const newWindow = window.open('', '_blank');
    newWindow.document.write(reportContent);
    newWindow.document.close();

    showNotification('Report generated in new window', 'success');
}

function createReportHTML() {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>StratML Performance Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 40px; }
                .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .metric { display: inline-block; margin: 10px 20px; text-align: center; }
                .metric-value { font-size: 2em; font-weight: bold; color: #667eea; }
                .metric-label { font-size: 0.9em; color: #6c757d; }
                .performance-summary { margin: 30px 0; }
                .indicator-row { margin: 15px 0; padding: 10px; border-left: 4px solid #667eea; }
                @media print { body { margin: 20px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 StratML Performance Report</h1>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="summary">
                <h2>Executive Summary</h2>
                <div class="metric">
                    <div class="metric-value">${analyticsData.totalGoals}</div>
                    <div class="metric-label">Goals</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${analyticsData.totalObjectives}</div>
                    <div class="metric-label">Objectives</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${analyticsData.totalIndicators}</div>
                    <div class="metric-label">Indicators</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${analyticsData.avgPerformance.toFixed(1)}%</div>
                    <div class="metric-label">Avg Performance</div>
                </div>
            </div>
            
            <div class="performance-summary">
                <h2>Performance Overview</h2>
                <div class="metric">
                    <div class="metric-value" style="color: #28a745;">${analyticsData.onTrackCount}</div>
                    <div class="metric-label">On Track</div>
                </div>
                <div class="metric">
                    <div class="metric-value" style="color: #dc3545;">${analyticsData.atRiskCount}</div>
                    <div class="metric-label">At Risk</div>
                </div>
            </div>
            
            <h2>Top Performing Indicators</h2>
            ${performanceData.sort((a, b) => b.performance - a.performance).slice(0, 5).map(item => `
                <div class="indicator-row">
                    <h3>${item.name}</h3>
                    <p>Performance: <strong>${item.performance.toFixed(1)}%</strong></p>
                </div>
            `).join('')}
        </body>
        </html>
    `;
}

function compareDocuments() {
    if (currentDocuments.length < 2) {
        showNotification('Upload at least 2 documents to compare', 'error');
        return;
    }

    document.getElementById('compareModal').style.display = 'block';
    document.getElementById('compareContent').innerHTML = '<p>Comparison feature is being prepared...</p>';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function handleSearch() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    if (!searchTerm) {
        document.querySelectorAll('.section, .subsection, .performance-indicator').forEach(el => {
            el.style.display = '';
            el.style.backgroundColor = '';
        });
        return;
    }

    document.querySelectorAll('.section, .subsection, .performance-indicator').forEach(el => {
        const text = el.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            el.style.display = '';
            el.style.backgroundColor = '#fff3cd';
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            el.style.display = 'none';
        }
    });
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function getElementText(parent, tagName) {
    const element = parent.querySelector(tagName);
    return element ? element.textContent.trim() : '';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    } catch {
        return dateString;
    }
}

function formatValue(value, unit = '') {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return unit ? `${num.toLocaleString()} ${unit}` : num.toLocaleString();
}

function getRoleIcon(role) {
    if (!role) return '👤';
    const roleLower = role.toLowerCase();
    if (roleLower.includes('manager') || roleLower.includes('director')) return '👔';
    if (roleLower.includes('executive')) return '💼';
    if (roleLower.includes('analyst')) return '📊';
    if (roleLower.includes('developer')) return '💻';
    if (roleLower.includes('designer')) return '🎨';
    if (roleLower.includes('support')) return '🛠️';
    return '👤';
}

function addInteractiveFeatures() {
    document.querySelectorAll('.performance-indicator').forEach(indicator => {
        indicator.addEventListener('click', function() {
            this.classList.toggle('expanded');
        });
    });

    document.querySelectorAll('.stakeholder').forEach(stakeholder => {
        stakeholder.addEventListener('click', function() {
            this.classList.toggle('expanded');
        });
    });
}

function createGaugeChart(dataPoint) {
    const performance = dataPoint.performance;
    
    return {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [performance, 100 - performance],
                backgroundColor: [
                    performance >= 100 ? '#28a745' : performance >= 80 ? '#20c997' : performance >= 60 ? '#ffc107' : '#dc3545',
                    '#e9ecef'
                ],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '⚡ Performance Gauge',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    display: false
                }
            },
            animation: {
                animateRotate: true,
                duration: 2000
            }
        },
        plugins: [{
            id: 'gaugeText',
            beforeDraw: function(chart) {
                const ctx = chart.ctx;
                ctx.save();
                ctx.font = 'bold 24px Inter';
                ctx.fillStyle = performance >= 80 ? '#28a745' : performance >= 60 ? '#ffc107' : '#dc3545';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
                const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2 + 30;
                ctx.fillText(`${performance.toFixed(1)}%`, centerX, centerY);
                
                ctx.font = '14px Inter';
                ctx.fillStyle = '#6c757d';
                ctx.fillText('Performance Score', centerX, centerY + 30);
                ctx.restore();
            }
        }]
    };
}
