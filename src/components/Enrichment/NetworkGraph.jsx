import React, { Component } from 'react';
import _ from 'lodash';
import * as d3 from 'd3';
// import d3plus from 'd3plus';
import { Dimmer, Loader, Message } from 'semantic-ui-react';
import './NetworkGraph.scss';
import { networkByCluster, limitValues } from '../Shared/helpers';

class NetworkGraph extends Component {
  state = {
    noResults: false,
    dataCombined: [],
    networkWidth: 0,
    networkContainerWidth: 0,
    networkHeight: 0,
    networkContainerHeight: 0,
  };
  networkContainerRef = React.createRef();

  componentDidMount() {
    this.prepareAndRenderTree();

    let resizedFn;
    window.addEventListener('resize', () => {
      clearTimeout(resizedFn);
      resizedFn = setTimeout(() => {
        this.windowResized();
      }, 200);
    });
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.networkData !== prevProps.networkData ||
      this.props.nodeCutoff !== prevProps.nodeCutoff ||
      this.props.edgeCutoff !== prevProps.edgeCutoff ||
      this.props.networkSortBy !== prevProps.networkSortBy ||
      this.props.networkSettings.facets !== prevProps.networkSettings.facets
    ) {
      this.prepareAndRenderTree();
    }
    if (this.props.networkSearchValue !== prevProps.networkSearchValue) {
      this.handleNodeSearch();
    }
  }

  handleNodeSearch = () => {
    // setTimeout(() => {
    let str = this.props.networkSearchValue;
    let nodeLabel = this.props.networkSettings.nodeLabel;
    if (str.length === 0) {
      d3.selectAll('.node-label').style('opacity', 1);
    } else {
      d3.selectAll('.node-label').style('opacity', 0);
      var keep = d3.selectAll('.node-label').filter(function(d) {
        return d[nodeLabel].toLowerCase().includes(str);
      });
      keep.style('opacity', 1);
    }
    // }, 300);
  };

  windowResized = () => {
    d3.select('div.tooltip-pieSlice').remove();
    d3.select('tooltipEdge').remove();
    d3.select(`#svg-${this.props.networkSettings.id}`).remove();
    this.prepareAndRenderTree();
  };

  getHeight() {
    // if (
    //   this.networkContainerRef.current !== null &&
    //   this.networkContainerRef.current.parentElement.offsetHeight !== 0
    // ) {
    //   return this.networkContainerRef.current.parentElement.offsetHeight;
    // } else {
    return Math.max(
      document.documentElement.clientHeight,
      window.innerHeight || 0,
    );
    //}
  }

  getWidth(totalClusters, relevantNodesLength) {
    let adjustedDocumentWidth = window.innerWidth - 100;
    let networkContainerWidth = 0;
    if (this.networkContainerRef.current !== null) {
      networkContainerWidth = this.networkContainerRef.current.parentElement
        .offsetWidth;
    }

    // we may want to discuss an algorithm using nodes and clusters to determining svg width
    // if (totalClusters > 1 && totalClusters < 20) {
    //   let networkCalculatedWidth = relevantNodesLength * 25;
    //   return Math.max(
    //     networkCalculatedWidth,
    //     adjustedDocumentWidth,
    //     networkContainerWidth
    //   );
    // }
    // if (totalClusters >= 20) {
    if (totalClusters !== 1) {
      // let networkCalculatedWidth = (relevantNodesLength * .75) * totalClusters * 1.5;
      let networkCalculatedWidth = relevantNodesLength * 35;
      console.log(networkCalculatedWidth);
      return Math.max(
        networkCalculatedWidth,
        adjustedDocumentWidth,
        networkContainerWidth,
      );
    } else {
      // if (totalClusters === 1) {
      return adjustedDocumentWidth;
    }
  }

  prepareAndRenderTree = () => {
    const { networkData, networkSettings } = this.props;
    const self = this;
    // Prepare Data
    let formattedNodes = _.map(networkData.nodes, function(o) {
      return o.data;
    });

    let formattedLinks = _.map(networkData.edges, function(o) {
      return o.data;
    });

    _.forEach(formattedNodes, function(o1) {
      let picked = _.pick(o1, networkSettings.facets);
      let metaData = {};
      _.forEach(networkSettings.metaLabels, (value, i) => {
        metaData[value] = o1[networkSettings.meta[i]];
      });

      let i = 0;
      o1.facets = _.map(picked, value => {
        let prop = networkSettings.propLabel[i];
        i++;
        return {
          prop,
          value,
          metaData,
        };
      });
    });

    function getNodeLowestSignificantValue(facets) {
      return Math.min(...facets.map(f => f.value).filter(v => v != null));
    }
    formattedNodes.forEach(node => {
      const lowestTestValueInNode = getNodeLowestSignificantValue(node.facets);
      node.lowestValue = lowestTestValueInNode;
    });

    let filteredNodes = formattedNodes.filter(
      n => n.lowestValue <= this.props.nodeCutoff,
    );

    const mostSignificantTestValue = Math.min(
      ...filteredNodes.map(f => f.lowestValue).filter(v => v != null),
    );

    let filteredLinks = formattedLinks.filter(
      l => l.EnrichmentMap_similarity_coefficient >= this.props.edgeCutoff,
    );

    if (filteredNodes.length !== 0 && filteredNodes.length != null) {
      let relevantNodeIds = filteredNodes.map(n => n.id);

      // filter links out that contain source or target of node not meeting cutoff
      let relevantLinks = filteredLinks.filter(
        l =>
          _.includes(relevantNodeIds, l.source) &&
          _.includes(relevantNodeIds, l.target),
      );

      let minSetVar = _.min(
        _.map(filteredNodes, function(o) {
          return o[networkSettings.nodeSize];
        }),
      );
      let maxSetVar = _.max(
        _.map(filteredNodes, function(o) {
          return o[networkSettings.nodeSize];
        }),
      );
      let minLineVar = _.min(
        _.map(relevantLinks, function(o) {
          return o[networkSettings.linkSize];
        }),
      );
      let maxLineVar = _.max(
        _.map(relevantLinks, function(o) {
          return o[networkSettings.linkSize];
        }),
      );

      let radius = d3.scaleSqrt();
      let radiusVar = radius
        .range(networkSettings.radiusScale)
        .domain([minSetVar, maxSetVar]);
      let lineScaleBase = d3.scaleLinear();
      let lineScaleVar = lineScaleBase
        .range(networkSettings.lineScale)
        .domain([minLineVar, maxLineVar]);

      this.props.onHandleTotals(filteredNodes.length, relevantLinks.length);

      let dataCombinedVar = {
        nodes: filteredNodes,
        links: relevantLinks,
      };

      let clusters = networkByCluster(dataCombinedVar);
      // only run if there are clusters
      if (clusters.children.length > 0) {
        function getClusterLowestSignificantValue(nodes) {
          let facetsArr = nodes.flatMap(node => node.facets);
          return Math.min(
            ...facetsArr.map(f => f.value).filter(v => v != null),
          );
        }

        clusters.children.forEach(cluster => {
          _.forEach(clusters.children, function(cluster, i) {
            let lowestTestValue = getClusterLowestSignificantValue(
              cluster.nodes,
            );
            let edgecount = cluster.links.length;
            let nodecount = cluster.nodes.length;
            cluster.significance = lowestTestValue;
            cluster.edgecount = edgecount;
            cluster.nodecount = nodecount;
          });
        });

        console.log(clusters.children.length);
        const totalClusters = clusters.children.length;

        // Prepare Settings
        let relevantNodesLength = relevantNodeIds.length;
        const containerWidth = this.getWidth(
          totalClusters,
          relevantNodesLength,
        );
        // calculate height based on the containerRef
        const containerHeight = this.getHeight();
        const width =
          containerWidth -
          networkSettings.margin.left -
          networkSettings.margin.right;
        const height =
          containerHeight -
          networkSettings.margin.top -
          networkSettings.margin.bottom;
        this.setState({
          networkContainerWidth: containerWidth,
          networkWidth: width,
          networkContainerHeight: containerHeight,
          networkHeight: height,
        });

        // Prepare Chart
        const chartDiv = d3.select('#' + networkSettings.id);
        chartDiv
          .append('svg')
          .attr('id', `svg-${networkSettings.id}`)
          .attr('class', 'network-chart-area nwChart')
          .attr('width', '100%')
          .attr('height', '100%')
          .attr('viewBox', `0 0 ${width} ${height}`);

        let chartSVG = d3.select(`#svg-${networkSettings.id}`);
        const chartView = chartSVG.append('g').attr('class', 'overlay');
        // Prepare NetworkPlot'

        let color = d3
          .scaleLinear()
          .domain(networkSettings.nodeColorScale)
          .range(networkSettings.nodeColors);

        let arc = d3.arc();

        let pie = d3
          .pie()
          .sort(null)
          .value(function(d) {
            return 1;
          });

        function sumBySize(d) {
          let sumofRadii = _.sumBy(d.nodes, function(o) {
            return radiusVar(o[networkSettings.nodeSize]);
          });
          //return Math.sqrt(sumofRadii + d.size);
          return sumofRadii + d.size;
        }

        let treemap = d3
          .treemap()
          .tile(d3.treemapResquarify)
          .size([width, height])
          .round(true)
          .paddingInner(1);

        let root = d3
          .hierarchy(clusters)
          .eachBefore(d => {
            d.data.id = (d.parent ? d.parent.data.id + '.' : '') + d.data.name;
            d.key = d.data.id;
          })
          .sum(sumBySize)
          .sort(
            (a, b) =>
              self.props.networkSortBy
                // FOR SORT BY LIST
                .map(sortBy => {
                  return (
                    (sortBy === 'significance' ? 1 : -1) *
                    (a.data[sortBy] - b.data[sortBy])
                  );
                })
                .reduce((prev, value) => {
                  return prev || value;
                }),

            // FOR SORT BY DROPDOWN, RATHER THAN LIST
            // if (self.props.networkSortBy === 'Significance') {
            //   return (
            //     a.data.significance - b.data.significance ||
            //     b.data.nodecount - a.data.nodecount ||
            //     b.data.edgecount - a.data.edgecount
            //   );
            // } else if (self.props.networkSortBy === 'edgecount') {
            //   return (
            //     b.data.edgecount - a.data.edgecount ||
            //     a.data.significance - b.data.significance ||
            //     b.data.nodecount - a.data.nodecount
            //   );
            // } else if (self.props.networkSortBy === 'nodecount') {
            //   return (
            //     b.data.nodecount - a.data.nodecount ||
            //     a.data.significance - b.data.significance ||
            //     b.data.edgecount - a.data.edgecount
            //   );
            // } else {
            //   return a.data.significance - b.data.significance;
            // }
          );

        treemap(root);
        let cell = chartView
          // .attr('class', 'cell')
          .selectAll('g')
          .data(root.leaves())
          .enter()
          .append('g')
          .attr('transform', function(d) {
            return `translate(${d.x0}, ${d.y0})`;
          });

        // var pt_px = 0.75, // convert font size in pt into pixels
        //   font_size = 10, // or whatever it is set to in the stylesheet
        //   averageLetterWidth = 0.58344; // average character width for Arial

        cell
          .append('rect')
          .attr('class', 'rect')
          .attr('id', function(d) {
            return d.data.id;
          })
          .attr('width', function(d) {
            return d.x1 - d.x0;
          })
          .attr('height', function(d) {
            return d.y1 - d.y0;
          })
          // .attr('fill', '#e0e1e2')
          .attr('fill', '#e8e8e8 ')
          // determines thickness of bounding boxes
          .style('stroke-width', 0.25)
          .style('stroke-opacity', 1)
          .style('stroke', 'black')
          // Paul - make this opacity 0 if you don't want lines, want to see full labels
          .style('opacity', 0.5);
        // .style('opacity', function(d) {
        //   if (d.data.length * averageLetterWidth * pt_px * font_treesize >= d.dx) {
        //     return 0;
        //   }
        //   return 1;
        // });

        if (cell._groups.length > 0) {
          cell.each(function(d, i) {
            let cellWidth = d.x1 - d.x0;
            let cellHeight = d.y1 - d.y0;
            if (d.data.nodes.length > 0) {
              let simulation = d3
                .forceSimulation(d.data.nodes)
                .force(
                  'link',
                  d3.forceLink(d.data.links).id(function(d) {
                    return d.id;
                  }),
                )
                .force(
                  'charge',
                  d3
                    .forceManyBody()
                    .strength([-1200])
                    .distanceMax([500]),
                )
                .force('center', d3.forceCenter(cellWidth / 2, cellHeight / 2))
                .force(
                  'collision',
                  // collide(0.5)
                  d3.forceCollide().radius(function(d) {
                    // return radiusVar(d[networkSettings.nodeSize]);
                    let r = radiusVar(d[networkSettings.nodeSize]);
                    return r;
                    // to space out the nodes more, use a function like this...
                    // return 2 * r - 1;
                  }),
                )
                .stop();
              //
              for (
                let i = 0,
                  n = Math.ceil(
                    Math.log(simulation.alphaMin()) /
                      Math.log(1 - simulation.alphaDecay()),
                  );
                i < n;
                ++i
              ) {
                simulation.tick();
              }

              // Resolves collisions between d and all other circles.
              // function collide(alpha) {
              //   var quadtree = d3.quadtree(d.data.nodes);
              //   return function(d) {
              //     var rb = 2 * radiusVar + 1, // separation between circles
              //       nx1 = d.x - rb,
              //       nx2 = d.x + rb,
              //       ny1 = d.y - rb,
              //       ny2 = d.y + rb;

              //     quadtree.visit(function(quad, x1, y1, x2, y2) {
              //       if (quad.point && quad.point !== d) {
              //         var x = d.x - quad.point.x,
              //           y = d.y - quad.point.y,
              //           l = Math.sqrt(x * x + y * y);
              //         if (l < rb) {
              //           l = ((l - rb) / l) * alpha;
              //           d.x -= x *= l;
              //           d.y -= y *= l;
              //           quad.point.x += x;
              //           quad.point.y += y;
              //         }
              //       }
              //       return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
              //     });
              //   };
              // }

              let link = d3
                .select(this)
                .append('g')
                .attr('class', 'links')
                .selectAll('line')
                .data(d.data.links)
                .enter()
                .append('line')
                .style('stroke', function(d) {
                  // unhighlight this if you want to highlight highest link coefficient
                  // if (
                  //   d.EnrichmentMap_similarity_coefficient ===
                  //   highestLinkCoefficient
                  // ) {
                  //   return self.props.networkSettings.colorHighestLinkCoefficient;
                  // } else
                  return '#0080ff';
                })
                .style('stroke-opacity', 0.3)
                // .style('stroke-opacity', function(d) {
                //   if (
                //     d.EnrichmentMap_similarity_coefficient ===
                //     highestLinkCoefficient
                //   ) {
                //     return 1;
                //   } else return 0.3;
                // })
                .style('stroke-width', function(d) {
                  return lineScaleVar(d[networkSettings.linkSize]);
                })
                .attr('x1', function(d) {
                  return Math.max(
                    radiusVar(d.source[networkSettings.nodeSize]),
                    Math.min(
                      cellWidth - radiusVar(d.source[networkSettings.nodeSize]),
                      d.source.x,
                    ),
                  );
                })
                .attr('y1', function(d) {
                  return Math.max(
                    radiusVar(d.source[networkSettings.nodeSize]),
                    Math.min(
                      cellHeight -
                        radiusVar(d.source[networkSettings.nodeSize]),
                      d.source.y,
                    ),
                  );
                })
                .attr('x2', function(d) {
                  return Math.max(
                    radiusVar(d.target[networkSettings.nodeSize]),
                    Math.min(
                      cellWidth - radiusVar(d.target[networkSettings.nodeSize]),
                      d.target.x,
                    ),
                  );
                })
                .attr('y2', function(d) {
                  return Math.max(
                    radiusVar(d.target[networkSettings.nodeSize]),
                    Math.min(
                      cellHeight -
                        radiusVar(d.target[networkSettings.nodeSize]),
                      d.target.y,
                    ),
                  );
                })
                .on('mouseover', function(d, i) {
                  let OverlapGenesLimited = limitValues(
                    d.EnrichmentMap_Overlap_genes,
                    15,
                  );
                  let tooltipLRPosition =
                    d3.event.pageX > window.innerWidth * 0.8
                      ? `${d3.event.pageX - 275}px`
                      : `${d3.event.pageX + 10}px`;
                  let tooltipTBPosition =
                    d3.event.pageY > window.innerHeight * 0.7
                      ? `${d3.event.pageY - 150}px`
                      : `${d3.event.pageY - 15}px`;
                  d3.select(this)
                    .transition()
                    .duration('50')
                    .attr('opacity', 0.5)
                    .attr('d', arc.outerRadius(50).innerRadius(0));
                  div
                    .transition()
                    .duration(50)
                    .style('opacity', 1);
                  div
                    .html(
                      `<b>Overlap Size: </b>${d.EnrichmentMap_Overlap_size}<br/><b>Overlap Coefficient: </b>${d.EnrichmentMap_similarity_coefficient}<br/><b>Source: </b>${d.source.EnrichmentMap_GS_DESCR}<br/><b>Target: </b>${d.target.EnrichmentMap_GS_DESCR}<br/><b>Overlap Genes: </b>${OverlapGenesLimited}`,
                    )
                    .style('left', tooltipLRPosition)
                    .style('top', tooltipTBPosition);
                })
                .on('mouseout', function(d, i) {
                  // d3.select(this).transition()
                  //     .duration('50')
                  //     .attr('opacity', .75)
                  //     .attr("d", arc.outerRadius(r).innerRadius(0));
                  div
                    .transition()
                    .duration('50')
                    .style('opacity', 0);
                });

              const node = d3
                .select(this)
                .append('g')
                .attr('class', 'nodes')
                .selectAll('g')
                .data(d.data.nodes)
                .enter()
                .append('g')
                .attr('transform', function(d) {
                  return `translate(${Math.max(
                    radiusVar(d[networkSettings.nodeSize]),
                    Math.min(
                      cellWidth - radiusVar(d[networkSettings.nodeSize]),
                      d.x,
                    ),
                  )},${Math.max(radiusVar(d[networkSettings.nodeSize]), Math.min(cellHeight - radiusVar(d[networkSettings.nodeSize]), d.y))})`;
                })
                .call(
                  d3
                    .drag()
                    .on('start', function() {
                      dragstarted(this);
                    })
                    .on('drag', function(d) {
                      ondrag(d, cellHeight, cellWidth, this);
                    })
                    .on('end', dragended),
                );

              node.each(multiple);
              // labels
              // if there are only x number of nodes or less in a cluster, then place label above them
              let clusterNodeLength = d.data.nodes.length;
              if (clusterNodeLength === 1) {
                node
                  .append('text')
                  .attr('class', 'node-label')
                  .attr('id', 'rectWrap')
                  .text(function(d) {
                    let text = d[networkSettings.nodeLabel];
                    if (text.length < 40) {
                      return text;
                    } else {
                      let textSubstring = text.substring(0, 38);
                      return `${textSubstring}...`;
                    }
                    // return d[networkSettings.nodeLabel];
                  })
                  .style('font-size', '.9em')
                  .style('opacity', 1)
                  .attr('text-anchor', 'middle')
                  // to rotate text on boxes with one node
                  // .attr('transform', 'rotate(' + 5 + ')')
                  // .attr('x', -65);
                  // no need to alter x, it positions text in the middle without calculation
                  // .attr('x', function(d) {
                  //   return d.x / 2;
                  // })
                  // .attr('y', function(d) {
                  //   return d.y + d.dy / 2;
                  // })
                  // .attr('dy', '.35em')
                  // randomly place text below or above node
                  // .attr('y', 20 * (Math.random() < 0.5 ? -1 : 1));
                  .attr('y', 25);
                // .attr('y', function(d) {
                // return -1.1 * d[networkSettings.nodeSize];
                // });
              } else {
                node
                  .append('text')
                  .attr('class', 'node-label')
                  .attr('id', 'rectWrap')
                  .text(function(d) {
                    let text = d[networkSettings.nodeLabel];
                    if (text.length < 30) {
                      return text;
                    } else {
                      let textSubstring = text.substring(0, 28);
                      return `${textSubstring}...`;
                    }
                    // return d[networkSettings.nodeLabel];
                  })
                  .style('font-size', '.9em')
                  .style('opacity', 1)
                  .attr('x', 15)
                  .attr('y', 3);
              }

              let div = d3
                .select('body')
                .append('div')
                .attr('class', 'tooltip-pieSlice')
                .style('opacity', 0);

              //Append a defs (for definition) element to your SVG
              var defs = chartSVG.append('defs');

              //most  color scale
              var mostSignificantColorScale = d3
                .scaleLinear()
                .range(self.props.networkSettings.mostSignificantColorScale);
              //Append a linearGradient element to the defs and give it a unique id
              var mostSignificantGradient = defs
                .append('linearGradient')
                .attr('id', 'most-significant-linear-gradient')
                // DIAGONAL GRADIENT
                .attr('x1', '30%')
                .attr('y1', '30%')
                .attr('x2', '70%')
                .attr('y2', '70%');

              //Append multiple color stops by using D3's data/enter step
              mostSignificantGradient
                .selectAll('stop')
                .data(mostSignificantColorScale.range())
                .enter()
                .append('stop')
                .attr('offset', function(d, i) {
                  return i / (mostSignificantColorScale.range().length - 1);
                })
                .attr('stop-color', function(d) {
                  return d;
                });

              function multiple(d) {
                let r = radiusVar(d[networkSettings.nodeSize]);
                let node = d3.select(this);

                node
                  .selectAll('path')
                  .data(function(d) {
                    return pie(d.facets);
                  })
                  .enter()
                  .append('svg:path')
                  .attr('d', arc.outerRadius(r).innerRadius(0))
                  .attr('opacity', 0.75)
                  .style('opacity', function(d) {
                    let opacity =
                      d.data.value === mostSignificantTestValue ? 1.0 : 0.75;
                    return opacity;
                  })
                  .style('cursor', 'pointer')
                  .attr('stroke', 'black')
                  .style('fill', function(d) {
                    if (d.data.value === mostSignificantTestValue)
                      // return self.props.networkSettings
                      //   .colorMostSignificantTest;
                      return 'url(#most-significant-linear-gradient)';
                    if (d.data.value != null) return color(d.data.value);
                    return '#d3d3d3';
                  })
                  .on('click', function(d) {
                    // if (d3.event.defaultPrevented) return;
                    d3.selectAll('.tooltip-pieSlice').style('opacity', 0);
                    self.props.onHandlePieClick(
                      self.props.enrichmentStudy,
                      self.props.enrichmentModel,
                      self.props.enrichmentAnnotation,
                      d.data.metaData,
                      d.data.prop,
                    );
                  })
                  .on('mouseover', function(d, i) {
                    d3.select(this)
                      .transition()
                      .duration('50')
                      .attr('opacity', 0.5)
                      .attr('d', arc.outerRadius(50).innerRadius(0));
                    div
                      .transition()
                      .duration(50)
                      .style('opacity', 1);
                    let tooltipLRPosition =
                      d3.event.pageX > window.innerWidth * 0.8
                        ? `${d3.event.pageX - 275}px`
                        : `${d3.event.pageX + 10}px`;
                    let tooltipTBPosition =
                      d3.event.pageY > window.innerHeight * 0.85
                        ? `${d3.event.pageY - 100}px`
                        : `${d3.event.pageY - 15}px`;
                    let pValueDisplay;
                    if (Math.abs(d.data.value) > 0.001)
                      pValueDisplay = d.data.value.toPrecision(3);
                    else pValueDisplay = d.data.value.toExponential(3);
                    div
                      .html(
                        `<div className="tooltipEdge"><b>Description: </b>${d.data.metaData.Description}<br/><b>Test: </b>${d.data.prop}<br/><b>pValue: </b>${pValueDisplay}<br/><b>Ontology: </b>${d.data.metaData.Ontology}</div>`,
                      )
                      .style('left', tooltipLRPosition)
                      .style('top', tooltipTBPosition);
                  })
                  .on('mouseout', function(d, i) {
                    d3.select(this)
                      .transition()
                      .duration('50')
                      .attr('opacity', 0.75)
                      .attr('d', arc.outerRadius(r).innerRadius(0));
                    div
                      .transition()
                      .duration('50')
                      .style('opacity', 0);
                  });
              }

              // d3plus
              //   .textwrap()
              //   .container(d3.select('#rectWrap'))
              //   .draw();
              function dragstarted(o) {
                d3.event.sourceEvent.stopPropagation();
                d3.event.sourceEvent.preventDefault();
              }

              function ondrag(d, cellHeight, cellWidth, me) {
                d.x = d3.event.x;
                d.y = d3.event.y;
                let xPos = Math.max(
                  radiusVar(d[networkSettings.nodeSize]),
                  Math.min(
                    cellWidth - radiusVar(d[networkSettings.nodeSize]),
                    d.x,
                  ),
                );
                let yPos = Math.max(
                  radiusVar(d[networkSettings.nodeSize]),
                  Math.min(
                    cellHeight - radiusVar(d[networkSettings.nodeSize]),
                    d.y,
                  ),
                );

                d3.select(me).attr('transform', function(d) {
                  return `translate(${Math.max(
                    radiusVar(d[networkSettings.nodeSize]),
                    Math.min(
                      cellWidth - radiusVar(d[networkSettings.nodeSize]),
                      d.x,
                    ),
                  )},${Math.max(radiusVar(d[networkSettings.nodeSize]), Math.min(cellHeight - radiusVar(d[networkSettings.nodeSize]), d.y))})`;
                });

                link
                  .filter(function(l) {
                    return l.source === d;
                  })
                  .attr('x1', xPos)
                  .attr('y1', yPos);
                link
                  .filter(function(l) {
                    return l.target === d;
                  })
                  .attr('x2', xPos)
                  .attr('y2', yPos);
              }

              function dragended(d) {
                if (!d3.event.active) simulation.alphaTarget(0);
                d.fx = d3.event.x;
                d.fy = d3.event.y;
              }
            }
          });
          this.setState({
            noResults: false,
          });
        }

        chartSVG.call(
          d3
            .zoom()
            .extent([
              [0, 0],
              [width, height],
            ])
            .scaleExtent([1, 3])
            .on('zoom', zoomed),
        );

        // chartView.call(
        //   d3
        //     .drag()
        //     .on('start', dragstarted)
        //     .on('drag', dragged)
        //     .on('end', dragended)
        // );

        // function dragstarted(d) {
        // }

        // function dragged(d) {
        // }

        // function dragended(d) {
        // }

        function zoomed() {
          chartView.attr('transform', d3.event.transform);
        }
      }
    } else {
      this.setState({
        noResults: true,
      });
      this.props.onHandleTotals(0, 0);
    }
  };

  render() {
    const { noResults } = this.state;
    const { networkSettings, networkGraphReady } = this.props;
    const NoResults = noResults ? (
      <Message
        className="NoResultsMessage"
        icon="search"
        header="No Results"
        content="Please Adjust Filters"
      />
    ) : (
      ''
    );
    const RerenderingOverlay = !networkGraphReady ? (
      <div>
        <Dimmer active inverted>
          <Loader size="large">Graph Rendering</Loader>
        </Dimmer>
      </div>
    ) : (
      ''
    );

    return (
      <>
        {RerenderingOverlay}
        {NoResults}
        <div
          ref={this.networkContainerRef}
          id={networkSettings.id}
          className="NetworkChartContainer"
        ></div>
      </>
    );
  }
}

export default NetworkGraph;