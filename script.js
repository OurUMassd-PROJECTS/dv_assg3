let svg, zoom, ForceSimulation, node_elements, link_elements, node_degree, scale_radius, data, color, countries, original_degree;

// Global scope functions
function zoomIn() {
    if (zoom) {
        svg.transition().call(zoom.scaleBy, 1.2);
    }
}

function zoomOut() {
    if (zoom) {
        svg.transition().call(zoom.scaleBy, 0.8);
    }
}

function defaultZoom() {
    // Reloading the page to reset the visualization to default zoom in level
    location.reload();
}

function applySettings() {
    linkStrength = parseFloat(document.getElementById('linkStrength').value);
    collideForce = parseFloat(document.getElementById('collideForce').value);
    chargeForce = parseFloat(document.getElementById('chargeForce').value);
    nodeSize = document.querySelector('input[name="nodeSize"]:checked').value;
    console.log(linkStrength, collideForce, chargeForce)
    ForceSimulation.force("link", d3.forceLink(data.links)
        .id(d => d.id)
        .distance(80)
        .strength(linkStrength))
    ForceSimulation.force("collide").strength(collideForce);
    ForceSimulation.force("charge", d3.forceManyBody().strength(chargeForce))

    // Updating node size based on the selected option
    node_elements.select("circle").attr("r", (d, i) => {
        switch (nodeSize) {
            case "publications":
                node_degree = {}
                data.nodes.map((node, index) => {
                    node_degree[data.nodes[index].id] = (data.nodes[index].publications).length
                })
                return scale_radius(node_degree[d['id']] * 1.2)
            case "degree":
                return scale_radius(original_degree[d['id']] * 1.2);
            case "citations":
                node_degree = {}
                data.nodes.forEach((node, index) => {
                    const totalCitations = node.publications.reduce((sum, publication) => {
                        console.log(typeof (publication))
                        return sum + publication['Citations']
                    }, 0);
                    node_degree[data.nodes[index].id] = totalCitations;
                });
                return scale_radius(node_degree[d['id']] * 1.2);
            default:
                return scale_radius(node_degree[d['id']] * 1.2);
        }
    }).attr("fill", (d, i) => color(countries[i]));

    ForceSimulation.nodes(data.nodes);
    ForceSimulation.alpha(1).restart();
}

d3.json("https://raw.githubusercontent.com/OurUMassd-PROJECTS/dv_assg3/main/author_network.json").then(jsonData => {
    data = jsonData
    svg = d3.select('svg').append("svg").attr("viewBox", "0 0 3000 3000")

    const tooltip = d3.select("#tooltip")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    const width = parseInt(svg.attr("viewBox").split(' ')[2])
    const height = parseInt(svg.attr("viewBox").split(' ')[3])
    const main_group = svg.append("g").attr("transform", `translate(0, 50)`)
    countries = data.nodes.map(node => {
        const publications = node.publications;
        if (publications && publications.length > 0) {
            return publications[0][Object.keys(publications[0])[0]].Country;
        } else {
            return null;
        }
    });

    zoom = d3.zoom()
        .scaleExtent([0.5, 5]) // adjusting the scale extent as needed
        .on("zoom", zoomed);

    svg.call(zoom);

    function zoomed() {
        main_group.attr("transform", d3.event.transform);

        svg.attr("transform", d3.event.transform);
    }

    // Function to generate random unique colors with distinct shades
    function generateRandomColors(numColors) {
        const colors = [];
        const usedColors = new Set();

        while (colors.length < numColors) {
            const randomColor = chroma.random().hex();

            // Ensuring the color is unique by checking against the set of used colors
            if (!usedColors.has(randomColor)) {
                usedColors.add(randomColor);
                colors.push(randomColor);
            }
        }

        return colors;
    }


    const hexColors = generateRandomColors(data.nodes.length);

    // Filtering out nodes without country information
    const nodesWithCountry = data.nodes.filter((node, index) => countries[index] !== null);
    color = d3.scaleOrdinal(hexColors)
        .domain(Array.from(new Set(countries.filter(country => country !== null))));

    console.log(color)

    //calculating degree of the nodes:
    node_degree = {}; //initiating an object
    d3.map(data.links, d => {
        if (d.source in node_degree) {
            node_degree[d.source]++
        }
        else {
            node_degree[d.source] = 0
        }
        if (d.target in node_degree) {
            node_degree[d.target]++
        }
        else {
            node_degree[d.target] = 0
        }
    });

    original_degree = node_degree;
    scale_radius = d3.scaleLinear()
        .domain(d3.extent(Object.values(node_degree)))
        .range([5, 20]); // Adjust the range to change the node size

    const scale_link_stroke_width = d3.scaleLinear()
        .domain(d3.extent(data.links, d => d.year))
        .range([1, 5])

    link_elements = main_group.append("g")
        .attr('transform', `translate(${width / 2},${height / 2})`)
        .selectAll(".line")
        .data(data.links)
        .enter()
        .append("line")
        .style("stroke", (d) => "black")
        .style("stroke-width", d => scale_link_stroke_width(10));

    const drag = d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);

    node_elements = main_group.append("g")
        .attr('transform', `translate(${width / 2},${height / 2})`)
        .selectAll(".circle")
        .data(data.nodes)
        .enter()
        .append('g')
        .call(drag)
        .on("mouseenter", function (d, data) {
            const [x, y] = d3.mouse(svg.node());
            tooltip.transition()
                .duration(200)
                .style("opacity", .9)
                .style("top", (y) + "py") // Adjust the vertical position
                .style("left", (x) + "px");
            tooltip.html(`<strong>Author ID:</strong> ${d.id}`)

        })
        .on("mousemove", (m, d) => {
            tooltip.style("opacity", .9)
        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(400)
                .style("opacity", 0)
            d3.selectAll("title").text(" ")
            d3.selectAll(".inactive").classed("inactive", false)
        })

    node_elements.append("circle")
        .attr("r", (d, i) => { return scale_radius(node_degree[d['id']] * 1.2) })
        .attr("fill", (d, i) => color(countries[i]));

    node_elements.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .text(d => d.title)

    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(20,20)");

    ForceSimulation = d3.forceSimulation(data.nodes)
        .force("collide",
            d3.forceCollide().radius((d, i) => { return scale_radius(node_degree[i]) * 5 }).strength(0))
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .force("charge", d3.forceManyBody().strength(-80))
        .force("link", d3.forceLink(data.links)
            .id(d => d.id)
            .distance(80)
            .strength(1)
        )
        .on("tick", ticked);

    function ticked() {
        node_elements.attr('transform', (d) => `translate(${d.x},${d.y})`)
        link_elements
            .attr("x1", d => d.source.x)
            .attr("x2", d => d.target.x)
            .attr("y1", d => d.source.y)
            .attr("y2", d => d.target.y)
    }

    function dragstarted(d) {
        if (!d3.event.active) ForceSimulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) ForceSimulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // Add the following lines to dynamically create legend items
    const numColumns = 3; // Adjust the number of columns for the legend

    // Adding the following lines to dynamically create legend items with multiple columns
    const legendTable = document.querySelector('.legend-table table');
    const legendData = color.domain().map(d => ({ color: color(d), label: d }));

    // Calculating the number of rows needed
    const numRows = Math.ceil(legendData.length / numColumns);

    // Creating rows and cells based on the number of columns
    for (let i = 0; i < numRows; i++) {
        const legendRow = legendTable.insertRow(-1);

        for (let j = 0; j < numColumns; j++) {
            const index = i * numColumns + j;
            if (index < legendData.length) {
                const legendCell = legendRow.insertCell(j);
                const legendColor = document.createElement('div');
                legendColor.className = 'legend-color';
                legendColor.style.backgroundColor = legendData[index].color;
                legendCell.appendChild(legendColor);
                legendCell.appendChild(document.createTextNode(legendData[index].label));
            }
        }
    }

    function toggleLegend() {
        const legendTable = document.querySelector('.legend-table');
        const currentDisplay = window.getComputedStyle(legendTable).getPropertyValue('display');
        legendTable.style.display = (currentDisplay === 'none' || currentDisplay === '') ? 'block' : 'none';
    }

    // Attaching an event listener to the legend button
    document.querySelector('.toggle-legend-btn').addEventListener('click', toggleLegend);
});