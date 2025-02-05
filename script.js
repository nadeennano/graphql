// DOM Elements
const loginContainer = document.getElementById('login-container');
const profileContainer = document.getElementById('profile-container');
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const welcomeMessage = document.getElementById('welcome-message');
const userInfo = document.getElementById('user-info');
const xpDisplay = document.getElementById('xp-display');
const logoutBtn = document.getElementById('logout-btn');
//These lines use document.getElementById to find HTML elements by their IDs.
//  Each found element is stored in a variable for easy access and manipulation later in the script.


// Login function
async function login(event) {
event.preventDefault();
//event.preventDefault() stops the form from submitting the usual way,
// letting us handle it with JavaScript instead
// 
// .
const username = document.getElementById('username').value;
const password = document.getElementById('password').value;
const credentials = btoa(`${username}:${password}`);
//Retrieves the values entered by the user into the username and password fields.
//Encodes these credentials in a Base64 format (btoa stands for "binary to ASCII") for use in the HTTP header.


try {
    const response = await axios.post('https://adam-jerusalem.nd.edu/api/auth/signin', null, {
        headers: { 'Authorization': `Basic ${credentials}` }
    });
//Sends a POST request to the server for authentication.
//  The Authorization header uses the encoded credentials.


    const token = response.data;
    if (token && token.split('.').length === 3) {
        localStorage.setItem('jwt', token);
        localStorage.setItem('username', username);
        showProfilePage();
    } else {
        throw new Error('Invalid JWT token format');
    }
} catch (error) {
    console.error('Login Error:', error);
    errorMessage.textContent = 'Invalid login credentials';
}
}

//Checks if the server response contains a valid JWT token. If valid, 
//it saves the token and username to localStorage and calls showProfilePage.
//If there is an error during login, it catches and logs the error,
// and displays an error message.



// Show Profile Page
async function showProfilePage() {
loginContainer.classList.add('hidden');
profileContainer.classList.remove('hidden');
await fetchProfileData(); // Fetch user data
const username = localStorage.getItem('username');
welcomeMessage.innerHTML = `Welcome, ${username}!`;
}
//This function hides the login form and displays the profile section.

//It calls fetchProfileData to get the user's data from the server.

//Updates the welcome message with the username retrieved from localStorage.



// Fetch User Data
async function fetchProfileData() {
const token = localStorage.getItem('jwt');
//Explanation: This function is defined as async, which allows the use of await within it, enabling asynchronous operations to be written in a synchronous style.
//The function begins by retrieving the JWT token from the browser's local storage, which is stored under the key 'jwt'.

try {
// Fetch user ID first
const userIdResponse = await axios.post('https://adam-jerusalem.nd.edu/api/graphql-engine/v1/graphql', {
    query: `{ user { id } }`
}, {
    headers: { 'Authorization': `Bearer ${token}` }
});
//Explanation: The try block is used to handle any errors that might occur during the data fetching process.
//First, it sends a POST request to the server to fetch the user ID. This is done using the Axios library. The request includes a GraphQL query to get the user ID ({ user { id } }).  
//The JWT token is included in the request headers for authentication ('Authorization':Bearer ${token}``).

const userId = userIdResponse.data.data.user[0].id;
//Explanation: Extracts the user ID from the server's response. The response data is accessed to get the ID of the first user in the user array (user[0].id).


const query = `{
user(where: { id: { _eq: ${userId} } }) {
    id
    login
    firstName
    lastName
    auditRatio
    xps { path amount }
    audits { id }
    groups { id }
    transactions { createdAt amount type }
}
}`;
//Explanation: Constructs a new GraphQL query using the fetched user ID. This query requests detailed information about the user, including their ID, login, name, audit ratio, XP data, audits, groups, and transactions.


const response = await axios.post('https://adam-jerusalem.nd.edu/api/graphql-engine/v1/graphql', { query }, {
headers: { 'Authorization': `Bearer ${token}` }
});
//Explanation: Sends another POST request to the server with the new query to fetch the user's detailed data. The JWT token is again included in the request headers for authentication.
if (response.data && response.data.data && response.data.data.user) {
const user = response.data.data.user[0];
//Explanation: Checks if the server's response contains the expected user data. If the data is present, it extracts the user data for the first user in the user array.
localStorage.setItem('username', user.login);
//Explanation: Stores the user's login name in the local storage under the key 'username'.

renderProfile(user);
const totalXP = calculateTotalXP(user.xps);
xpDisplay.innerHTML = `XP: ${totalXP} KB`;
//Explanation: Calls the renderProfile function to update the profile information displayed on the page.

//Calculates the total XP using the calculateTotalXP function and updates the xpDisplay element with the calculated total XP.

createPieChart(user.transactions);
renderXPBarChart(user.transactions);
//Explanation: Calls the createPieChart and renderXPBarChart functions to render the pie chart and bar chart, respectively, using the user's transactions data.

} else {
throw new Error('User data is not available');
}
} catch (error) {
console.error('Error fetching profile data:', error);
errorMessage.textContent = 'Failed to fetch user data.';
}
}
//Explanation: If the user data is not available in the response, it throws an error with the message 'User data is not available'.

//The catch block catches any errors that occur during the fetching process, logs the error to the console, and displays an error message to the user by updating the errorMessage element.


// Render User Profile
function renderProfile(user) {
userInfo.innerHTML = `
    <p>ID: ${user.id}</p>
    <p>Login: ${user.login}</p>
    <p>Audits: ${user.audits.length}</p>
    <p>Groups: ${user.groups.length}</p>
    <p>Audit Ratio: ${user.auditRatio ? user.auditRatio.toFixed(1) : "N/A"}</p>
`;
}
//This function updates the HTML content inside the userInfo element with the user's profile data,
//including their ID, login, number of audits, groups, and audit ratio.

// Calculate Total XP (Modules only)
function calculateTotalXP(xps) {
const modulePathRegex = /module(?!\/piscine)/i;
const totalModuleXp = xps
    .filter(xp => modulePathRegex.test(xp.path))
    .reduce((sum, xp) => sum + xp.amount, 0);

return ((totalModuleXp + 70000) / 1000).toFixed(0);
}

//Filters the XP data to include only module-related XP (excluding piscine modules) and sums the XP amounts.

//Adds a base XP of 70,000 and converts the result to KB (by dividing by 1,000), rounding it to zero decimal places.


// Render XP bar chart using D3.js
function renderXPBarChart(transactions) {
d3.select("#xp-chart").selectAll("*").remove();  // حذف أي عناصر قديمة قبل إضافة جديدة
const data = transactions.map(txn => ({ date: new Date(txn.createdAt), amount: txn.amount }));
//Clears any existing chart in the xp-chart element.

//Maps the transaction data to extract the date and amount,
//converting the dates to Date objects.


const margin = { top: 30, right: 40, bottom: 60, left: 60 };
const width = 900 - margin.left - margin.right;
const height = 550 - margin.top - margin.bottom;

const svg = d3.select('#xp-chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
//Sets up the margins and dimensions for the SVG container.

//Creates and appends an SVG element to the xp-chart div, 
//and adds a group element (g) inside it for the chart,
//applying a transformation to account for the margins.


const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([0, width]);

const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.amount)]).nice()
    .range([height, 0]);
//Defines the x-axis scale as a time scale, 
//setting its domain to the range of dates in the data.

//Defines the y-axis scale as a linear scale,
//setting its domain to start from 0 and go up to the maximum amount in the data.

svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b %Y")));

svg.append('g')
    .call(d3.axisLeft(y).ticks(10));
//Appends the x-axis to the bottom of the chart, formatting the ticks as months and years.

//Appends the y-axis to the left of the chart, adding 10 ticks.        

svg.selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', d => x(d.date))
    .attr('y', d => y(d.amount))
    .attr('width', 10)
    .attr('height', d => height - y(d.amount))
    .attr('fill', 'steelblue');
}
//Selects and appends rectangles (rect) for each data point, setting their x and y positions based on the data, and their width and

// Create Skill Progress Pie Chart
function createPieChart(transactions) {
const skills = ['go', 'html', 'js', 'sql', 'css'];

const skillData = transactions
    .filter(tx => tx.type.startsWith('skill_'))
    .reduce((acc, tx) => {
        const skillType = tx.type.replace('skill_', '');
        if (skills.includes(skillType)) {
            acc[skillType] = Math.max(acc[skillType] || 0, tx.amount);
        }
        return acc;
    }, {});
//The function createPieChart starts by defining an array of skill names.

//It filters the transactions to only include those that represent 
//skill-related transactions (those starting with 'skill_').

//It then processes these transactions to determine the maximum amount of XP for each skill,
//creating an object (skillData) where keys are skill names and values are the maximum XP amounts for those skills.        

if (Object.keys(skillData).length === 0) {
    document.getElementById('skillPieChart').innerHTML = "<p>No data available</p>";
    return;
}

const totalXP = Object.values(skillData).reduce((sum, val) => sum + val, 0);
const labels = Object.keys(skillData);
const data = Object.values(skillData).map(value => ((value / totalXP) * 100).toFixed(2));
//If there is no skill data available, the function displays a message saying "No data available" and exits.

//Otherwise, it calculates the total XP for all skills,
//extracts the skill names (labels) and their respective XP values (data),
//and converts these values to percentages.

const ctx = document.getElementById('skillPieChart').getContext('2d');

// حذف أي رسم سابق قبل إضافة الرسم الجديد
if (ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}
//It gets the 2D drawing context of the canvas element (skillPieChart), which will be used to draw the chart.

//If there is an existing chart, it clears the canvas

new Chart(ctx, {
    type: 'pie',
    data: {
        labels: labels,
        datasets: [{
            data: data,
            backgroundColor: ['red', 'blue', 'green', 'purple', 'orange'],
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        plugins: {
            tooltip: {
                callbacks: {
                    label: tooltipItem => `${tooltipItem.label}: ${tooltipItem.raw}%`
                }
            }
        }
    }
});
}
//It creates a new pie chart using the Chart.jslibrary.

//The chart's data includes the skill names and their corresponding percentages.

//It also sets some options to make the chart responsive and customize the tooltips to display the percentage for each skill.





// Logout
function logout() {
localStorage.clear();
loginContainer.classList.remove('hidden');
profileContainer.classList.add('hidden');
}

//The logout function clears the localStorage,
//which removes the stored JWT token and username.

//It then hides the profile container and shows the login container,
//effectively logging the user out.

//The following lines add event listeners:

loginForm.addEventListener('submit', login);
logoutBtn.addEventListener('click', logout);
document.addEventListener('DOMContentLoaded', () => {
localStorage.clear();
loginContainer.classList.remove('hidden');
profileContainer.classList.add('hidden');
});

//loginForm.addEventListener('submit', login);: When the login form is submitted, it calls the login function.

//logoutBtn.addEventListener('click', logout);: When the logout button is clicked, it calls the logout function.

//document.addEventListener('DOMContentLoaded',
//() => { ... });: When the page is fully loaded, it clears the local storage and ensures the login container is visible and the profile container is hidden.
//This ensures the user starts from the login page if they are not already logged in.