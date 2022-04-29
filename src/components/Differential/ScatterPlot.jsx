import React, { Component } from 'react';
import _ from 'lodash';
import * as d3 from 'd3';
import * as hexbin from 'd3-hexbin';
import './ScatterPlot.scss';

class ScatterPlot extends Component {
  circles = [];
  bins = [];
  hexbin = hexbin.hexbin();
  objsBrush = {};

  state = {
    hoveredElement: 'bin' || 'circle',
    hoveredCircleData: {
      position: [],
      id: null,
      xstat: null,
      ystat: null,
    },
    hovering: false,
    tooltipPosition: null,
    brushing: false,
    resizeScalarX: 1,
    resizeScalarY: 1,
    volcanoCircleText: [],
    bins: [],
    circles: [],
    showCircles: true,
    showBins: true,
    isBinClicked: false,
    clickedBin: null,
    xxAxis: '',
    yyAxis: '',
    currentResults: [],
    zoomedOut: true,
  };

  componentDidMount() {
    const { differentialResultsUnfiltered } = this.props;
    window.addEventListener('resize', this.debouncedResizeListener);
    d3.select('#VolcanoChart').remove();
    this.setupVolcano();
    this.hexBinning(differentialResultsUnfiltered);
  }

  componentDidUpdate(prevProps) {
    const {
      differentialHighlightedFeatures,
      upperPlotsHeight,
      volcanoWidth,
      differentialResultsUnfiltered,
      filteredDifferentialTableData,
      differentialOutlinedFeature,
      differentialTest,
      volcanoCircleLabel,
      xAxisLabel,
      yAxisLabel,
      doXAxisTransformation,
      doYAxisTransformation,
    } = this.props;
    // this if/else if/else if statement in place to minimize re-renders - should cover all situations
    if (differentialTest !== prevProps.differentialTest) {
      // if the test is changed and data is cached, it won't stream, and this needs to run
      this.clearState();
      window.addEventListener('resize', this.debouncedResizeListener);
      d3.select('#VolcanoChart').remove();
      this.setupVolcano();
      this.hexBinning(differentialResultsUnfiltered);
      this.transitionZoom(
        differentialResultsUnfiltered,
        false,
        false,
        false,
        false,
      );
      const self = this;
      setTimeout(function() {
        self.highlightBrushedCircles();
      }, 250);
      this.setState({ zoomedOut: true });
    } else if (
      prevProps.xAxisLabel !== xAxisLabel ||
      prevProps.yAxisLabel !== yAxisLabel ||
      prevProps.doXAxisTransformation !== doXAxisTransformation ||
      prevProps.doYAxisTransformation !== doYAxisTransformation ||
      prevProps.upperPlotsHeight !== upperPlotsHeight ||
      prevProps.volcanoWidth !== volcanoWidth
    ) {
      // first when user changes dimensions, axis labels, or transform data
      let allDataInSelectedArea =
        this.state.currentResults.length > 0
          ? this.state.currentResults
          : differentialResultsUnfiltered;
      d3.select('#VolcanoChart').remove();
      this.setupVolcano();
      this.hexBinning(allDataInSelectedArea);
      // DEV - do we need both above and below
      this.transitionZoom(allDataInSelectedArea, false, true, false, true);
    } else if (
      filteredDifferentialTableData.length !==
      prevProps.filteredDifferentialTableData.length
    ) {
      if (this.state.transitioning) {
        this.setState({ transitioning: false });
      } else {
        // fired when table data changed (table filter OR set analysis)
        let allDataInSelectedArea =
          this.state.currentResults.length > 0
            ? this.state.currentResults
            : differentialResultsUnfiltered;
        // DEV - need to revisit the plot functions, when scatter is hidden
        // if (upperPlotsVisible && volcanoPlotVisible)
        this.transitionZoom(allDataInSelectedArea, false, true, false, true);
      }
    }
    if (volcanoCircleLabel !== prevProps.volcanoCircleLabel) {
      this.handleCircleLabels();
    }
    if (
      differentialOutlinedFeature !== prevProps.differentialOutlinedFeature ||
      !_.isEqual(
        _.sortBy(differentialHighlightedFeatures),
        _.sortBy(prevProps.differentialHighlightedFeatures),
      )
    ) {
      this.highlightBrushedCircles();
    }
  }

  componentWillUnmount() {
    d3.select('#VolcanoChart').remove();
    window.removeEventListener('resize', this.debouncedResizeListener);
  }

  debouncedResizeListener = () => {
    let resizedFn;
    clearTimeout(resizedFn);
    resizedFn = _.debounce(() => {
      this.windowResized();
    }, 200);
  };

  clearState = () => {
    // Dev - when should we call this?
    // d3.select('#VolcanoChart').remove();
    // needed when when the component doesn't unmount,
    // for example, on test change with cached data
    this.objsBrush = {};
    this.setState({
      hoveredElement: 'bin' || 'circle',
      hoveredCircleData: {
        position: [],
        id: null,
        xstat: null,
        ystat: null,
      },
      hovering: false,
      tooltipPosition: null,
      brushing: false,
      resizeScalarX: 1,
      resizeScalarY: 1,
      volcanoCircleText: [],
      bins: [],
      circles: [],
      showCircles: true,
      showBins: true,
      isBinClicked: false,
      clickedBin: null,
      xxAxis: '',
      yyAxis: '',
      currentResults: [],
    });
  };

  setupVolcano() {
    const {
      upperPlotsHeight,
      volcanoWidth,
      differentialResultsUnfiltered,
      doXAxisTransformation,
      xAxisLabel,
      doYAxisTransformation,
      yAxisLabel,
    } = this.props;
    const { xScale, yScale } = this.scaleFactory(differentialResultsUnfiltered);

    this.xxAxis = d3.axisTop(xScale).ticks();
    this.yyAxis = d3.axisRight(yScale).ticks();
    const svg = d3
      .select('#volcano')
      .append('svg')
      .attr('width', volcanoWidth + 50)
      .attr('height', upperPlotsHeight + 20)
      .attr('id', 'VolcanoChart')
      .attr('class', 'VolcanoPlotSVG')
      .on('click', () => this.handleSVGClick());

    svg
      .append('defs')
      .append('svg:clipPath')
      .attr('id', 'clip')
      .append('svg:rect')
      .attr('width', volcanoWidth + 50)
      .attr('height', upperPlotsHeight + 20)
      .attr('x', 0)
      .attr('y', -15);

    var area = svg
      .append('g')
      .attr('clip-path', 'url(#clip)')
      .attr('id', 'clip-path');

    d3.select('#clip-path')
      .append('g')
      .attr('class', 'volcanoPlotD3BrushSelection')
      .attr('fill', 'none');

    area.append('g').attr('id', 'filtered-elements');
    area.append('g').attr('id', 'nonfiltered-elements');

    d3.select('#VolcanoChart')
      .append('g')
      .attr('class', 'volcanoPlotYAxis NoSelect')
      .attr('id', 'yaxis-line')
      .attr('transform', 'translate(30, 0)')
      .call(this.yyAxis);

    d3.select('#VolcanoChart')
      .append('text')
      .attr('class', 'volcanoAxisLabel NoSelect')
      .attr('textAnchor', 'middle')
      .attr('transform', `rotate(-90,20,${upperPlotsHeight * 0.5 + 20})`)
      .attr('x', 60)
      .attr('y', `${upperPlotsHeight * 0.5 + 20}`)
      .attr('font-size', '18px')
      .style(
        'font-family',
        'Lato, Helvetica Neue, Arial, Helvetica, sans-serif',
      )
      .text(function() {
        return doYAxisTransformation ? '-log(' + yAxisLabel + ')' : yAxisLabel;
      });

    d3.select('#VolcanoChart')
      .append('g')
      .attr('class', 'volcanoPlotXAxis NoSelect')
      .attr('id', 'xaxis-line')
      .attr('transform', 'translate(0,' + (upperPlotsHeight - 35) + ')')
      .call(this.xxAxis);

    d3.select('#VolcanoChart')
      .append('text')
      .attr('class', 'volcanoAxisLabel NoSelect')
      .attr('x', volcanoWidth * 0.5 + 10)
      .attr('y', upperPlotsHeight - 15)
      .attr('font-size', '18px')
      .style(
        'font-family',
        'Lato, Helvetica Neue, Arial, Helvetica, sans-serif',
      )
      .text(function() {
        return doXAxisTransformation ? '-log(' + xAxisLabel + ')' : xAxisLabel;
      });
    const self = this;
    // Dev - separate dbl from single
    svg.on('dblclick', () => {
      if (this.state.zoomedOut) return;
      self.setState({
        currentResults: [],
        zoomedOut: true,
        transitioningDoubleClick: true,
      });
      // this changes filteredTableData in the parent
      // which in componentDidUpdate calls transitionZoom
      self.props.onHandleVolcanoPlotSelectionChange(
        self.props.differentialResults,
        true,
      );
    });
    // cannot call transitionZoom,
    // because we don't don't what the differential results will look like with current filters applied
    // svg.on('dblclick', () => {
    //   this.setState({ transitioning: true });
    //   this.transitionZoom(
    //     differentialResultsUnfiltered,
    //     true,
    //     false,
    //     true,
    //     true,
    //   );
    // });
  }

  hexBinning(data) {
    const { volcanoWidth, upperPlotsHeight } = this.props;
    if (data.length > 2500) {
      const { xScale, yScale } = this.scaleFactory(data);
      const { bins, circles } = this.parseDataToBinsAndCircles(
        data,
        xScale,
        yScale,
      );
      // this.bins = bins;
      // this.circles = circles;
      this.setState({ bins, circles }, function() {
        this.renderBins(bins);
        this.renderCircles(circles);
      });
    } else {
      this.scaleFactory(data);
      this.renderCircles(data);
    }
    this.setupBrush(volcanoWidth, upperPlotsHeight);
  }

  determineBinColor(binArray, length) {
    const color = d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0, d3.max(binArray, d => d.length) / 5]);

    return color(length);
  }

  parseDataToBinsAndCircles(data, xScale, yScale) {
    const { xAxisLabel, yAxisLabel } = this.props;

    const hexb = hexbin
      .hexbin()
      .x(d => xScale(this.doTransform(d[xAxisLabel], 'x')))
      .y(d => yScale(this.doTransform(d[yAxisLabel], 'y')))
      .radius(5);

    let bins = [];
    bins = hexb(data);

    var circ = [];
    var b = [];

    bins.forEach((bin, index) => {
      if (bin.length <= 5) {
        circ.push(...bin.flatMap(b => b));
      } else {
        b.push(bin);
      }
    });

    return { bins: b, circles: circ };
  }

  renderBinsFilter(bins) {
    const svg = d3.select('#filtered-elements');

    svg
      .selectAll('path')
      .data(bins)
      .enter()
      .append('path')
      .attr('stroke', '#aab1c0')
      .attr('stroke-opacity', 1)
      .attr('stroke-width', 1)
      .attr('d', d => `M${d.x},${d.y}${this.hexbin.hexagon(5)}`)
      .attr('fill', d => '#E0E1E2');
  }

  renderBins(bins) {
    if (d3.select('#nonfiltered-elements').size() !== 0) {
      const svg = d3.select('#nonfiltered-elements');
      svg
        .selectAll('path')
        .data(bins)
        .enter()
        .append('path')
        .attr('stroke', '#000')
        .attr('stroke-opacity', 1)
        .attr('stroke-width', 1)
        .attr('class', 'bin')
        .attr('d', d => `M${d.x},${d.y}${this.hexbin.hexagon(5)}`)
        .attr('fill', d => this.determineBinColor(bins, d.length))
        .attr('id', d => `path-${Math.ceil(d.x)}-${Math.ceil(d.y)}-${d.length}`)
        .attr('cursor', 'pointer')
        .on('mouseenter', d => {
          this.handleBinHover(d);
        })
        .on('mouseleave', d => {
          this.handleBinLeave(d, bins);
          d3.select('#tooltip').remove();
        })
        .on('click', (item, index) => {
          d3.event.stopPropagation();
          if (!d3.event.metaKey && !d3.event.ctrlKey) {
            d3.select('#tooltip').remove();
            d3.select('#nonfiltered-elements')
              .selectAll('circle')
              .remove();
            let circles = [...this.state.circles, ...item];
            this.renderCircles(circles);
            this.setState({
              circles: circles,
            });

            d3.select(
              `#path-${Math.ceil(item.x)}-${Math.ceil(item.y)}-${item.length}`,
            ).remove();
          }
        });
    }
  }

  renderCirclesFilter(circles) {
    const {
      differentialResultsUnfiltered,
      differentialFeatureIdKey,
      xAxisLabel,
      yAxisLabel,
    } = this.props;

    const { xScale, yScale } = this.scaleFactory(
      this.state.currentResults.length > 0
        ? this.state.currentResults
        : differentialResultsUnfiltered,
    );
    const circlesWithBothXAndYValues = circles.filter(
      c =>
        typeof c[xAxisLabel] === 'number' && typeof c[yAxisLabel] === 'number',
    );
    const svg = d3.select('#filtered-elements');
    svg
      .selectAll('circle')
      .data(circlesWithBothXAndYValues)
      .enter()
      .append('circle')
      .attr('cx', d => `${xScale(this.doTransform(d[xAxisLabel], 'x'))}`)
      .attr('cy', d => `${yScale(this.doTransform(d[yAxisLabel], 'y'))}`)
      .attr('fill', '#E0E1E2')
      .attr('r', 3)
      .attr('stroke', '#aab1c0')
      .attr('strokeWidth', 0.4)
      .attr('class', 'volcanoPlot-dataPoint')
      .attr('circleid', d => `${d[differentialFeatureIdKey]}`)
      .attr('key', (d, index) => `${d[differentialFeatureIdKey]}_${index}`)
      .attr('data', d => JSON.stringify(d))
      .attr('ystatistic', d => `${this.doTransform(d[yAxisLabel], 'y')}`)
      .attr('xstatistic', d => `${this.doTransform(d[xAxisLabel], 'x')}`);
  }

  renderCircles = circles => {
    const {
      differentialResultsUnfiltered,
      differentialFeatureIdKey,
      xAxisLabel,
      yAxisLabel,
    } = this.props;
    const { xScale, yScale } = this.scaleFactory(
      this.state.currentResults.length > 0
        ? this.state.currentResults
        : differentialResultsUnfiltered,
    );

    if (d3.select('#nonfiltered-elements').size() !== 0) {
      const svg = d3.select('#nonfiltered-elements');
      const circlesWithBothXAndYValues = circles.filter(
        c =>
          typeof c[xAxisLabel] === 'number' &&
          typeof c[yAxisLabel] === 'number',
      );
      svg
        .selectAll('circle')
        .data(circlesWithBothXAndYValues)
        .enter()
        .append('circle')
        .attr('cx', d => `${xScale(this.doTransform(d[xAxisLabel], 'x'))}`)
        .attr('cy', d => `${yScale(this.doTransform(d[yAxisLabel], 'y'))}`)
        .attr('fill', '#1678c2')
        .attr('r', 3)
        .attr('stroke', '#000')
        .attr('strokeWidth', 0.4)
        .attr('class', 'volcanoPlot-dataPoint')
        .attr('id', d => `volcanoDataPoint-${d[differentialFeatureIdKey]}`)
        .attr('circleid', d => `${d[differentialFeatureIdKey]}`)
        .attr('key', (d, index) => `${d[differentialFeatureIdKey]}_${index}`)
        .attr('data', d => JSON.stringify(d))
        .attr('ystatistic', d => `${this.doTransform(d[yAxisLabel], 'y')}`)
        .attr('xstatistic', d => `${this.doTransform(d[xAxisLabel], 'x')}`)
        .attr('cursor', 'pointer')
        .on('mouseenter', e => {
          this.handleCircleHover(e);
        })
        .on('mouseleave', e => {
          this.handleCircleLeave(e);
          d3.select('#tooltip').remove();
        })
        .on('click', e => {
          d3.select('#tooltip').remove();
          d3.event.stopPropagation();
          const elem = d3.select(
            `circle[id='volcanoDataPoint-${e[differentialFeatureIdKey]}`,
          );

          if (d3.event.metaKey || d3.event.ctrlKey) {
            // control-click dot
            if (elem.attr('class').endsWith('highlighted')) {
              let elemData = JSON.parse(
                elem._groups[0][0].attributes.data.value,
              );
              let clickedElems = [
                ...this.props.differentialHighlightedFeatures.filter(
                  elem => elem !== elemData[differentialFeatureIdKey],
                ),
              ];
              this.props.onHandleDotClick(e, clickedElems, 0, false, false);

              // this.setState({
              //   clickedElements: clickedElems,
              // });
            } else {
              let clickedDotValues = [...[elem._groups[0][0]]].map(elem =>
                elem.attributes ? JSON.parse(elem.attributes.data.value) : elem,
              );
              let clickedDotFeatureId = clickedDotValues.map(
                el => el[differentialFeatureIdKey],
              );
              let allElems = [
                ...this.props.differentialHighlightedFeatures,
              ].concat(clickedDotFeatureId);
              this.props.onHandleDotClick(e, allElems, 0, false, false);
            }
          } else {
            // simple dot click
            if (elem.attr('class').endsWith('outlined')) {
              // already outlined
              this.props.onResetDifferentialOutlinedFeature();
            } else {
              this.props.onHandleDotClick(
                e,
                [JSON.parse(elem._groups[0][0].attributes.data.value)],
                0,
                false,
                true,
                elem,
              );
            }
          }
        });
      this.highlightBrushedCircles();
    }
  };

  scaleFactory(scaleData) {
    const {
      volcanoWidth,
      upperPlotsHeight,
      xAxisLabel,
      yAxisLabel,
    } = this.props;

    var xMM = this.getMaxAndMin(scaleData, xAxisLabel);
    var yMM = this.getMaxAndMin(scaleData, yAxisLabel);
    xMM = [this.doTransform(xMM[0], 'x'), this.doTransform(xMM[1], 'x')];
    yMM = [this.doTransform(yMM[0], 'y'), this.doTransform(yMM[1], 'y')];

    const xScale = d3
      .scaleLinear()
      .domain([Math.min(...xMM), Math.max(...xMM)])
      .range([64, volcanoWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([Math.min(...yMM), Math.max(...yMM)])
      .range([upperPlotsHeight - 64, 10]);

    return {
      xScale: xScale,
      yScale: yScale,
      xMax: Math.max(...xMM),
      xMin: Math.min(...xMM),
      yMax: Math.max(...yMM),
      yMin: Math.min(...yMM),
    };
  }

  getCircleOrBin = key => {
    const { differentialTableData, differentialFeatureIdKey } = this.props;
    let el = null;
    const circleWithKey = [...differentialTableData].find(
      c => c[this.props.differentialFeatureIdKey] === key,
    );
    if (circleWithKey) {
      const circleIdentifier = circleWithKey[differentialFeatureIdKey] || null;
      if (circleIdentifier) {
        el = document.getElementById(`volcanoDataPoint-${circleIdentifier}`);
      } else return null;
    }
    if (el) {
      return { element: d3.select(el)._groups[0][0], type: 'circle' };
    } else {
      const bin = this.state.bins.find(bin => {
        return bin.some(b => b[differentialFeatureIdKey] === key);
      });
      if (bin && bin.x && bin.y && bin.length) {
        return {
          element: d3.select(
            `#path-${Math.ceil(bin.x)}-${Math.ceil(bin.y)}-${bin.length}`,
          )._groups[0][0],
          type: 'bin',
        };
      } else return null;
    }
  };

  removeScatterBrush = () => {
    const brush = d3
      .select('.volcanoPlotD3BrushSelection')
      .selectAll('rect.selection');
    const brushObjs = this.state.objsBrushState;
    if (
      brush.nodes().length !== 0 &&
      brush.nodes()[0].getAttribute('x') !== null &&
      brushObjs != null
    ) {
      d3.select('.volcanoPlotD3BrushSelection').call(brushObjs.move, null);
    }
  };

  resizeBrushSelection = () => {
    this.removeScatterBrush();
    // add resizing later after priorities
  };

  windowResized = () => {
    d3.select('#VolcanoChart').remove();
    this.setupVolcano();
    this.hexBinning(this.state.currentResults);
    this.transitionZoom(this.state.currentResults, false, false, false, true);
  };

  doTransform(value, axis) {
    const { doXAxisTransformation, doYAxisTransformation } = this.props;
    if (axis === 'x' && doXAxisTransformation) {
      return -Math.log10(value);
    } else if (axis === 'y' && doYAxisTransformation) {
      return -Math.log10(value);
    } else {
      return value;
    }
  }

  unhighlightBrushedCircles = () => {
    const circles = d3.selectAll('circle.volcanoPlot-dataPoint');
    circles
      // .attr('style', 'fill: #1678c2')
      // .attr('r', 3)
      .classed('highlighted', false)
      .classed('outlined', false);
  };

  highlightBrushedCircles = () => {
    const {
      differentialHighlightedFeatures,
      differentialOutlinedFeature,
    } = this.props;
    if (d3.select('#nonfiltered-elements').size() !== 0) {
      if (
        !differentialHighlightedFeatures?.length &&
        differentialOutlinedFeature === ''
      ) {
        d3.select('#nonfiltered-elements')
          .selectAll('text')
          .remove();
      }

      // set circles back to default
      d3.select('#nonfiltered-elements')
        .selectAll('circle')
        .attr('fill', '#1678c2')
        .attr('stroke', '#000')
        .attr('stroke-width', 1)
        .attr('r', 3)
        .classed('highlighted', false)
        .classed('outlined', false);
    }

    // set bins back to default
    d3.select('#nonfiltered-elements')
      .selectAll('path')
      .attr('fill', d => this.determineBinColor(this.state.bins, d.length))
      .attr('stroke', '#000')
      .attr('class', 'bin')
      .attr('d', d => `M${d.x},${d.y}${this.hexbin.hexagon(5)}`);
    this.highlightCircles();
    this.outlineCircle();
    this.handleCircleLabels();
  };

  handleCircleLabels = () => {
    const {
      differentialHighlightedFeatures,
      differentialOutlinedFeature,
      differentialFeatureIdKey,
    } = this.props;
    const { circles } = this.state;
    let combinedCircleFeatureIdsArr = [...differentialHighlightedFeatures];
    if (differentialOutlinedFeature !== '') {
      const differentialOutlinedFeatureArr = [differentialOutlinedFeature];
      combinedCircleFeatureIdsArr = _.union(
        [...differentialHighlightedFeatures],
        [...differentialOutlinedFeatureArr],
      );
    }

    let combinedCircleElementsArr = [];
    if (combinedCircleFeatureIdsArr?.length > 0) {
      combinedCircleElementsArr = [...combinedCircleFeatureIdsArr].map(elem => {
        let el = null;
        const circleWithKey = [...circles].find(
          c => c[this.props.differentialFeatureIdKey] === elem,
        );
        if (circleWithKey) {
          const circleIdentifier =
            circleWithKey[differentialFeatureIdKey] || null;
          if (circleIdentifier) {
            el = document.getElementById(
              `volcanoDataPoint-${circleIdentifier}`,
            );
          }
        }
        return el ? d3.select(el)._groups[0][0] : null;
      });
    }

    if (combinedCircleElementsArr.length) {
      this.handleBrushedText({ _groups: [combinedCircleElementsArr] });
    } else {
      if (d3.select('#nonfiltered-elements').size() !== 0) {
        d3.select('#nonfiltered-elements')
          .selectAll('text')
          .remove();
      }
    }
  };

  highlightCircles = () => {
    const {
      differentialHighlightedFeatures,
      differentialOutlinedFeature,
    } = this.props;
    if (differentialHighlightedFeatures?.length > 0) {
      differentialHighlightedFeatures.forEach(element => {
        // style all highlighted circles
        const highlightedCircleId = this.getCircleOrBin(element);
        if (highlightedCircleId) {
          const highlightedCircle = d3.select(highlightedCircleId?.element);
          let radius = element === differentialOutlinedFeature ? 7 : 6;
          let stroke =
            element === differentialOutlinedFeature ? '#1678c2' : '#000';
          // let strokeWidth =
          //   element === differentialOutlinedFeature ? 2 : 1;
          if (highlightedCircle != null) {
            if (highlightedCircleId?.type === 'circle') {
              highlightedCircle.attr('stroke', stroke);
              highlightedCircle.attr('stroke-width', 1);
              highlightedCircle.attr('fill', '#ff4400');
              highlightedCircle.classed('highlighted', true);
              highlightedCircle.attr('r', radius);
              highlightedCircle.classed('highlighted', true);
              highlightedCircle.raise();
            } else {
              // bin highlight
              highlightedCircle.attr('fill', '#ff4400');
              highlightedCircle.classed('highlighted', true);
              highlightedCircle.attr('stroke', stroke);
              highlightedCircle.attr('stroke-width', 1);
              highlightedCircle.classed('highlighted', true);
              highlightedCircle.raise();
            }
          }
        }
      });
    }
  };

  outlineCircle = () => {
    const { differentialOutlinedFeature } = this.props;
    if (differentialOutlinedFeature) {
      // style outline highlighted circle
      const outlinedId = this.getCircleOrBin(differentialOutlinedFeature);
      if (outlinedId) {
        const outlined = d3.select(outlinedId?.element);
        if (outlined != null) {
          if (outlinedId?.type === 'circle') {
            if (outlined.attr('class').endsWith('highlighted')) {
              outlined.attr('fill', '#ff4400');
            } else {
              outlined.attr('fill', '#ffffff');
            }
            outlined.attr('stroke-width', 2);
          } else {
            let bin = outlined?._groups[0] || null;
            if (bin?.length > 0) {
              let classVar = bin[0]?.attributes['class']?.nodeValue || null;
              if (classVar?.includes('highlighted')) {
                outlined.attr('fill', '#ff4400');
              } else {
                outlined.attr('fill', '#ffffff');
              }
              outlined.attr('stroke-width', 1);
            }
          }
          outlined.attr('r', 7);
          outlined.classed('outlined', true);
          outlined.attr('stroke', '#1678c2');
          outlined.attr('d', d => `M${d.x},${d.y}${this.hexbin.hexagon(8)}`);
          outlined.raise();
        }
      }
    }
  };

  handleBinHover = d => {
    if (!this.state.brushing) {
      const bin = d3.select(
        `#path-${Math.ceil(d.x)}-${Math.ceil(d.y)}-${d.length}`,
      );
      const binClass = bin.attr('class');
      if (binClass.includes('outlined') && binClass.includes('highlighted')) {
        bin.attr('stroke', '#1678c2');
        bin.attr('stroke-width', 1);
        bin.attr('fill', '#ff4400');
        bin.attr('d', d => `M${d.x},${d.y}${this.hexbin.hexagon(9)}`);
        bin.raise();
      } else if (binClass.endsWith('highlighted')) {
        bin.attr('stroke', '#000');
        bin.attr('stroke-width', 1);
        bin.attr('fill', '#ff4400');
        bin.attr('d', d => `M${d.x},${d.y}${this.hexbin.hexagon(7)}`);
        bin.raise();
      } else if (binClass.endsWith('outlined')) {
        bin.attr('stroke', '#1678c2');
        bin.attr('stroke-width', 1);
        bin.attr('fill', '#fff');
        bin.attr('d', d => `M${d.x},${d.y}${this.hexbin.hexagon(9)}`);
        bin.raise();
      } else {
        bin
          .attr('fill', '#1678c2')
          .attr('stroke', '#000')
          .attr('stroke-width', 1)
          .attr('d', d => `M${d.x},${d.y}${this.hexbin.hexagon(6)}`)
          .raise();
      }

      this.setState({
        hoveredBin: d,
        hoveredElement: 'bin',
        hovering: true,
      });

      this.getToolTip();
    }
  };

  handleCircleHover = e => {
    const elem = d3.select(
      `circle[id='volcanoDataPoint-${e[this.props.differentialFeatureIdKey]}`,
    )._groups[0][0];
    if (!this.state.brushing) {
      const hoveredData = {
        id: elem.attributes['circleid']?.value,
        xstat: elem.attributes['xstatistic']?.value,
        ystat: elem.attributes['ystatistic']?.value,
        position: [elem.attributes['cx']?.value, elem.attributes['cy']?.value],
      };
      const hoveredElement = `volcanoDataPoint-${elem.attributes['circleid']?.value}`;
      const hoveredId = `#volcanoDataPoint-${elem.attributes['circleid']?.value}`;
      const hovered = document.getElementById(hoveredElement);
      if (hovered != null) {
        const circle = d3.select(hovered) ?? null;
        if (circle != null) {
          circle.attr('r', 8);
          circle.raise();
          this.setState({
            hoveredElement: 'circle',
            hoveredCircleData: hoveredData,
            hoveredCircleId: hoveredId || null,
            hoveredCircleElement: hoveredElement,
            hovering: true,
          });
        }
      }
      this.getToolTip();
    }
  };

  handleCircleLeave(e) {
    d3.selectAll('circle.volcanoPlot-dataPoint').classed('hovered', false);
    const hovered = document.getElementById(this.state.hoveredCircleElement);
    if (hovered != null) {
      const hoveredCircle =
        d3.select(
          `circle[id='volcanoDataPoint-${
            e[this.props.differentialFeatureIdKey]
          }`,
        )._groups[0][0] ?? null;
      if (hoveredCircle != null) {
        if (hoveredCircle.attributes['class'].value.endsWith('highlighted')) {
          hoveredCircle.attributes['r'].value = 6;
        } else if (
          hoveredCircle.attributes['class'].value.endsWith('outlined')
        ) {
          hoveredCircle.attributes['r'].value = 7;
        } else {
          hoveredCircle.attributes['r'].value = 3;
        }
        this.setState({
          hoveredCircleData: {
            position: [],
            id: null,
            xstat: null,
            ystat: null,
          },
          hovering: false,
        });
      }
    }
  }

  handleBinLeave(d, bins) {
    const bin = d3.select(
      `#path-${Math.ceil(d.x)}-${Math.ceil(d.y)}-${d.length}`,
    );
    const binClass = bin.attr('class');
    if (binClass.includes('outlined') && binClass.includes('highlighted')) {
      bin.attr('stroke', '#1678c2');
      bin.attr('stroke-width', 1);
      bin.attr('fill', '#ff4400');
      bin.attr('d', d => `M${d.x},${d.y}${this.hexbin.hexagon(8)}`);
    } else if (binClass.endsWith('outlined')) {
      bin.attr('stroke', '#1678c2');
      bin.attr('stroke-width', 1);
      bin.attr('fill', '#fff');
      bin.attr('d', d => `M${d.x},${d.y}${this.hexbin.hexagon(8)}`);
    } else if (binClass.endsWith('highlighted')) {
      bin.attr('stroke', '#000');
      bin.attr('stroke-width', 1);
      bin.attr('fill', '#ff4400');
      bin.attr('d', d => `M${d.x},${d.y}${this.hexbin.hexagon(6)}`);
    } else {
      bin
        .attr('fill', d => this.determineBinColor(bins, d.length))
        .attr('stroke', '#000')
        .attr('stroke-width', 1)
        .attr('d', d => `M${d.x},${d.y}${this.hexbin.hexagon(5)}`);
    }
    this.setState({
      hovering: false,
    });
  }

  getToolTip() {
    const {
      hoveredCircleData,
      hovering,
      hoveredElement,
      hoveredBin,
      circles,
    } = this.state;
    const {
      differentialFeatureIdKey,
      xAxisLabel,
      yAxisLabel,
      doXAxisTransformation,
      doYAxisTransformation,
      volcanoCircleLabel,
    } = this.props;

    const clipPathHeight =
      d3
        .select('#clip-path')
        .node()
        .getBBox().height - 40;

    const clipPathWidth =
      d3
        .select('#clip-path')
        .node()
        .getBBox().width - 47;

    if (hovering) {
      if (hoveredElement === 'bin') {
        const bin = hoveredBin;
        const tooltipHeight = clipPathHeight - (bin.y * 1 + 10);
        const tooltipWidth = bin.x * 1 + 200;
        const xstat = bin
          .map(circle => this.doTransform(circle[xAxisLabel], 'x'))
          .reduce((reducer, stat) => reducer + stat);

        const ystat = bin
          .map(circle => this.doTransform(circle[yAxisLabel], 'y'))
          .reduce((reducer, stat) => reducer + stat);

        const xText = doXAxisTransformation
          ? 'Avg -log(' +
            xAxisLabel +
            '): ' +
            parseFloat(xstat / bin.length).toFixed(4)
          : 'Avg ' +
            xAxisLabel +
            ': ' +
            parseFloat(xstat / bin.length).toFixed(4);
        const yText = doYAxisTransformation
          ? 'Avg -log(' +
            yAxisLabel +
            '): ' +
            parseFloat(ystat / bin.length).toFixed(4)
          : 'Avg ' +
            yAxisLabel +
            ': ' +
            parseFloat(ystat / bin.length).toFixed(4);
        if (d3.select('#nonfiltered-elements').size() !== 0) {
          d3.select('#nonfiltered-elements')
            .append('svg')
            .attr('width', 200)
            .attr('height', 75)
            .attr(
              'x',
              bin.x >= 240
                ? tooltipWidth >= clipPathWidth
                  ? bin.x * 1 - (tooltipWidth - clipPathWidth - 20)
                  : bin.x * 1 - 170
                : bin.x * 1 + 15,
            )
            .attr('y', tooltipHeight <= 110 ? bin.y * 1 - 85 : bin.y * 1 + 10)
            .attr('id', 'tooltip')
            .attr('class', 'NoSelect')
            .append('rect')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('fill', '#ff4400')
            .attr('rx', '5')
            .attr('ry', '5');
        }

        d3.select('#tooltip')
          .append('rect')
          .attr('width', '100%')
          .attr('height', '96%')
          .attr('fill', '#2e2e2e')
          .attr('stroke', '#000')
          .attr('rx', '3')
          .attr('ry', '3');

        d3.select('#tooltip')
          .append('text')
          .attr('fontSize', '13px')
          .attr('fill', '#FFF')
          .attr(
            'fontFamily',
            'Lato, Helvetica Neue, Arial, Helvetica, sans-serif',
          )
          .attr('textAnchor', 'left')
          .insert('tspan')
          .attr('x', 15)
          .attr('y', 23)
          .text(`Total features: ${bin.length}`)
          .insert('tspan')
          .attr('x', 15)
          .attr('y', 23 + 16)
          .text(xText)
          .insert('tspan')
          .attr('x', 15)
          .attr('y', 23 + 16 * 2)
          .text(yText);
      } else if (hoveredElement === 'circle') {
        let idText = differentialFeatureIdKey + ': ' + hoveredCircleData.id;
        if (circles.length && volcanoCircleLabel !== 'None') {
          const hoveredCircleExtendedData = [...circles].filter(
            c => hoveredCircleData.id === c[differentialFeatureIdKey],
          );
          if (hoveredCircleExtendedData.length) {
            idText = `${volcanoCircleLabel}: ${hoveredCircleExtendedData[0][volcanoCircleLabel]}`;
          }
        }
        const tooltipHeight =
          clipPathHeight - (hoveredCircleData.position[1] * 1 + 10);
        const tooltipWidth = hoveredCircleData.position[0] * 1 + 200;
        const xText = doXAxisTransformation
          ? '-log(' +
            xAxisLabel +
            '): ' +
            parseFloat(hoveredCircleData.xstat).toFixed(4)
          : xAxisLabel + ': ' + parseFloat(hoveredCircleData.xstat).toFixed(4);
        const yText = doYAxisTransformation
          ? '-log(' +
            yAxisLabel +
            '): ' +
            parseFloat(hoveredCircleData.ystat).toFixed(4)
          : yAxisLabel + ': ' + parseFloat(hoveredCircleData.ystat).toFixed(4);
        if (d3.select('#nonfiltered-elements').size() !== 0) {
          d3.select('#nonfiltered-elements')
            .append('svg')
            .attr('width', 200)
            .attr('height', 75)
            .attr(
              'x',
              hoveredCircleData.position[0] >= 240
                ? tooltipWidth >= clipPathWidth
                  ? hoveredCircleData.position[0] * 1 -
                    (tooltipWidth - clipPathWidth - 40)
                  : hoveredCircleData.position[0] * 1 - 170
                : hoveredCircleData.position[0] * 1 + 15,
            )
            .attr(
              'y',
              tooltipHeight <= 110
                ? hoveredCircleData.position[1] * 1 - 85
                : hoveredCircleData.position[1] * 1 + 10,
            )
            .attr('id', 'tooltip')
            .attr('class', 'NoSelect')
            .append('rect')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('fill', '#ff4400')
            .attr('rx', '5')
            .attr('ry', '5');
        }

        d3.select('#tooltip')
          .append('rect')
          .attr('width', '100%')
          .attr('height', '96%')
          .attr('fill', '#2e2e2e')
          .attr('stroke', '#000')
          .attr('rx', '3')
          .attr('ry', '3');

        d3.select('#tooltip')
          .append('text')
          .attr('fontSize', '13px')
          .attr('fill', '#FFF')
          .attr(
            'fontFamily',
            'Lato, Helvetica Neue, Arial, Helvetica, sans-serif',
          )
          .attr('textAnchor', 'left')
          .insert('tspan')
          .attr('x', 15)
          .attr('y', 23)
          .text(idText)
          .insert('tspan')
          .attr('x', 15)
          .attr('y', 23 + 16)
          .text(xText)
          .insert('tspan')
          .attr('x', 15)
          .attr('y', 23 + 16 * 2)
          .text(yText);
      }
    } else {
      return null;
    }
  }

  handleRerenderScatterplot(
    dataInSelection,
    isTableAlreadyAccurate,
    xScale,
    yScale,
    clearHighlightedData,
    doubleClick,
  ) {
    const self = this;
    const {
      differentialResults,
      differentialFeatureIdKey,
      differentialResultsUnfiltered,
      filteredDifferentialTableData,
    } = self.props;

    d3.select('#clip-path')
      .selectAll('path')
      .remove();

    d3.select('#clip-path')
      .selectAll('circle')
      .remove();

    if (d3.select('#nonfiltered-elements').size() !== 0) {
      d3.select('#nonfiltered-elements')
        .selectAll('text')
        .remove();
    }

    // const relevantTableData = doubleClick ? differentialResults : filteredDifferentialTableData;
    const filteredDifferentialTableDataFeatureIds = filteredDifferentialTableData.map(
      tableDataElement => tableDataElement[differentialFeatureIdKey],
    );
    const dataInViewCopy = [...dataInSelection];

    const dataInView = doubleClick
      ? differentialResultsUnfiltered
      : dataInViewCopy;

    const idsInView = dataInView.map(obj => obj[differentialFeatureIdKey]);

    function intersect(a, b) {
      return a.filter(Set.prototype.has, new Set(b));
    }
    const idsPassingTable = intersect(
      idsInView,
      filteredDifferentialTableDataFeatureIds,
    );

    let irrelevantIds = [];
    if (idsPassingTable.length !== idsInView.length) {
      irrelevantIds = _.difference(idsInView, idsPassingTable);
    }

    let irrelevantData = [];
    let relevantData = [];

    dataInView.forEach(obj => {
      if (irrelevantIds.includes(obj[differentialFeatureIdKey])) {
        irrelevantData.push(obj);
      } else {
        relevantData.push(obj);
      }
    });

    const irrelevantCirclesAndBins = self.parseDataToBinsAndCircles(
      irrelevantData,
      xScale,
      yScale,
    );

    const relevantCirclesAndBins = self.parseDataToBinsAndCircles(
      relevantData,
      xScale,
      yScale,
    );

    if (dataInView.length >= 2500 && relevantData.length >= 2500) {
      self.renderCirclesFilter(irrelevantCirclesAndBins.circles);
      self.renderBinsFilter(irrelevantCirclesAndBins.bins);
      self.renderCircles(relevantCirclesAndBins.circles);
      self.renderBins(relevantCirclesAndBins.bins);
    } else if (dataInView.length >= 2500 && relevantData.length < 2500) {
      self.renderCirclesFilter(irrelevantCirclesAndBins.circles);
      self.renderBinsFilter(irrelevantCirclesAndBins.bins);
      self.renderCircles(relevantData);
    } else {
      self.renderCirclesFilter(irrelevantCirclesAndBins.circles);
      self.renderCircles(relevantData);
    }

    const relevantDataOverride = doubleClick
      ? differentialResults
      : relevantData;
    if (isTableAlreadyAccurate !== true) {
      // only call this if the table has NOT already been updated
      self.props.onHandleVolcanoPlotSelectionChange(
        relevantDataOverride,
        clearHighlightedData,
      );
    }
  }

  transitionZoom(
    allDataInView,
    clearHighlightedData,
    isTableAlreadyAccurate,
    doubleClick,
    rerenderScatterplot,
  ) {
    const self = this;
    const { xScale, yScale } = self.scaleFactory(allDataInView);
    const unfilteredObject = self.parseDataToBinsAndCircles(
      allDataInView,
      xScale,
      yScale,
    );
    self.setState(
      {
        currentResults: allDataInView,
        bins: unfilteredObject.bins,
        circles: unfilteredObject.circles,
      },
      function() {
        // Dev - when should this function NOT be called?
        if (rerenderScatterplot) {
          this.handleRerenderScatterplot(
            allDataInView,
            isTableAlreadyAccurate,
            xScale,
            yScale,
            clearHighlightedData,
            doubleClick,
          );
        }
        d3.select('#clip-path')
          .selectAll('path')
          .attr('opacity', 0);
        if (d3.select('.volcanoPlotD3BrushSelection').size() !== 0) {
          d3.select('.volcanoPlotD3BrushSelection').call(
            self.objsBrush.move,
            null,
          );
        }
        self.xxAxis = d3.axisTop(xScale).ticks();
        self.yyAxis = d3.axisRight(yScale).ticks();
        let t = d3
          .select('svg')
          .transition()
          .duration(200);
        d3.select('#xaxis-line')
          .transition(t)
          .call(self.xxAxis);
        d3.select('#yaxis-line')
          .transition(t)
          .call(self.yyAxis);
        const container = d3.select('#clip-path').transition(t);
        const circle = container.selectAll('circle');
        circle
          .transition(t)
          .attr('cx', function(d) {
            return xScale(self.doTransform(d[self.props.xAxisLabel], 'x'));
          })
          .attr('cy', function(d) {
            return yScale(self.doTransform(d[self.props.yAxisLabel], 'y'));
          });
        const bin = container.selectAll('path');
        bin
          .transition(t)
          .delay(100)
          .duration(100)
          .attr('opacity', 1);
      },
    );
  }
  setupBrush(width, height) {
    const self = this;
    this.objsBrush = {};

    const brushingStart = function() {
      self.setState({
        brushing: d3.brushSelection(this)?.length > 0 ? true : false,
        hoveredCircleData: {
          position: [],
          id: null,
          xstat: null,
          ystat: null,
        },
      });
    };
    const endBrush = function() {
      if (d3.event.selection != null) {
        const brush = d3.brushSelection(this);

        const isBrushed = function(x, y) {
          const brushTest =
            brush[0][0] <= x &&
            x <= brush[1][0] &&
            brush[0][1] <= y &&
            y <= brush[1][1];
          return brushTest;
        };

        const brushedBins = self.state.bins
          .filter(bin => {
            return isBrushed(bin.x, bin.y);
          })
          .flatMap(elem => elem);

        const circles = d3.selectAll('circle.volcanoPlot-dataPoint');

        const brushedCircles = circles.filter(function() {
          const x = d3.select(this).attr('cx');
          const y = d3.select(this).attr('cy');
          return isBrushed(x, y);
        });

        const brushedDataArr = brushedCircles._groups[0].map(a => {
          return JSON.parse(a.attributes.data.value);
        });
        const total = [...brushedBins, ...brushedDataArr];
        if (!!total.length) {
          let boxSelectionToHighlight = self.mapBoxSelectionToHighlight([
            ...total,
          ]);
          if (
            // SHIFT BOX-SELECT FOR MULTI-FEATURE PLOTS
            d3.event.sourceEvent?.shiftKey
          ) {
            self.props.onHandleHighlightedFeaturesDifferential(
              boxSelectionToHighlight,
              true,
            );
            self.props.onReloadMultifeaturePlot(boxSelectionToHighlight);
          } else {
            // set this to true so that when lifecycle method is called after table changes, nothing happens
            self.setState({
              transitioning: true,
              zoomedOut: false,
            });
            self.transitionZoom(total, false, false, false, true);
          }
          // we are always clearing the box; if desired, place this in
          d3.select('.volcanoPlotD3BrushSelection').call(
            self.objsBrush.move,
            null,
          );
          self.setState({ brushing: false });
        }
      }
    };

    if (d3.selectAll('.brush').nodes().length > 0) {
      d3.selectAll('.brush').remove();
    }
    let brushScatter = d3
      .brush()
      .extent([
        [10, 5],
        [width + 25, height - 10],
      ])
      .on('start', brushingStart)
      .on('end', endBrush);
    brushScatter.filter(() => true);
    brushScatter.keyModifiers(false);
    self.objsBrush = brushScatter;
    d3.selectAll('.volcanoPlotD3BrushSelection').call(self.objsBrush);
    const brush = d3
      .select('.volcanoPlotD3BrushSelection')
      .selectAll('rect.selection');
    if (
      brush.nodes().length !== 0 &&
      brush.nodes()[0].getAttribute('x') !== null &&
      (self.state.resizeScalarX !== 1 || self.state.resizeScalarY !== 1)
    ) {
      d3.select('.volcanoPlotD3BrushSelection').call(self.objsBrush.move, [
        [
          parseFloat(brush.nodes()[0].getAttribute('x')) *
            self.state.resizeScalarX,
          parseFloat(brush.nodes()[0].getAttribute('y')) *
            self.state.resizeScalarY,
        ],
        [
          (parseFloat(brush.nodes()[0].getAttribute('x')) +
            parseFloat(brush.nodes()[0].getAttribute('width'))) *
            self.state.resizeScalarX,
          (parseFloat(brush.nodes()[0].getAttribute('y')) +
            parseFloat(brush.nodes()[0].getAttribute('height'))) *
            self.state.resizeScalarY,
        ],
      ]);
      self.setState({
        resizeScalarX: 1,
        resizeScalarY: 1,
        objsBrushState: self.objsBrush,
      });
    } else {
      d3.select('.volcanoPlotD3BrushSelection').call(self.objsBrush.move, null);
    }
  }

  mapBoxSelectionToHighlight = total => {
    const { plotMultiFeatureAvailable, differentialFeatureIdKey } = this.props;
    if (!plotMultiFeatureAvailable) return null;
    const scatterArr = total.map(item => ({
      id: item[differentialFeatureIdKey],
      value: item[differentialFeatureIdKey],
      key: item[differentialFeatureIdKey],
    }));
    const uniqueScatterArray = [
      ...new Map(scatterArr.map(item => [item.id, item])).values(),
    ];
    return uniqueScatterArray;
  };

  handleBrushedText = brushed => {
    // MAP brushedDataArr to circle text state
    const brushedCircleTextMapped = brushed?._groups[0].map(a => {
      if (!a || !a.attributes) return null;
      const columnData = JSON.parse(a.attributes['data'].nodeValue);
      const key = this.props.volcanoCircleLabel || 0;
      return {
        data: columnData[key],
        class: a.attributes['class'].nodeValue,
        id: a.attributes['id'].nodeValue,
        cx: a.attributes['cx'].nodeValue,
        cy: a.attributes['cy'].nodeValue,
        // class: a.attributes[1].nodeValue,
        // id: a.attributes[2].nodeValue,
        // cx: a.attributes[10].nodeValue,
        // cy: a.attributes[11].nodeValue,
        // r: a.attributes[0].nodeValue,
        // circleid: a.attributes[3].nodeValue,
        // stroke: a.attributes[5].nodeValue,
        // stoke-width: a.attributes[6].nodeValue,
        // fill: a.attributes[7].nodeValue
        // xstatistic: a.attributes[5 8].nodeValue,
        // ystatistic: a.attributes[6 9].nodeValue,
        // cursor: a.attributes[9 12].nodeValue,
        // style: a.attributes[10 13].nodeValue,
        // stroke: a.attributes[11].nodeValue,
        // stoke-width: a.attributes[12].nodeValue,
        // fill: a.attributes[13].nodeValue
      };
    });
    if (!brushedCircleTextMapped) return;
    const self = this;
    if (d3.select('#nonfiltered-elements').size() !== 0) {
      d3.select('#nonfiltered-elements')
        .selectAll('text')
        .remove();

      // if (d3.select('#nonfiltered-elements').size() !== 0) {
      d3.select('#nonfiltered-elements')
        .selectAll('text')
        .data(brushedCircleTextMapped)
        .enter()
        .append('text')
        .attr('key', d => {
          if (d) {
            return `volcanoCircleText-${d.id}`;
          }
        })
        .attr('class', 'NoSelect volcanoCircleTooltipText')
        .attr('transform', d => {
          if (d) {
            if (d.data) {
              //create temporary element to get text width in pixels
              let tempElem = document.createElement('span');
              document.body.appendChild(tempElem);
              tempElem.style.fontSize = `11px`;
              tempElem.style.position = 'absolute';
              tempElem.style.left = -1000;
              tempElem.style.top = -1000;
              tempElem.innerHTML = d.data;
              let width = tempElem.clientWidth;

              //remove temp element
              document.body.removeChild(tempElem);

              const cx =
                width + parseInt(d.cx) > self.props.volcanoWidth
                  ? parseInt(d.cx) - (8 + width)
                  : parseInt(d.cx) + 8;
              const cy = parseInt(d.cy) + 4;
              return `translate(${cx}, ${cy})rotate(0)`;
            }
          }
        })
        .style('font-size', '11px')
        .style('color', '#d3d3')
        .attr('textAnchor', d => {
          if (d) {
            const circleOnLeftSide = d.cx <= self.props.volcanoWidth / 2;
            return circleOnLeftSide ? 'start' : 'end';
          }
        })
        .style(
          'font-family',
          'Lato, Helvetica Neue, Arial, Helvetica, sans-serif',
        )
        .text(d => {
          if (d) {
            return d.data;
          }
        });
    }
  };

  handleSVGClick() {
    // this.props.onHandleResultsTableLoading(true);
    // this.unhighlightBrushedCircles();
    // this.props.(
    //   this.state.currentResults,
    //   true,
    // );
    // this.setState({
    //   brushing: false,
    //   resizeScalarX: 1,
    //   resizeScalarY: 1,
    //   volcanoCircleText: [],
    // });
    if (this.state.optionsOpen) return;
    this.props.onResetDifferentialOutlinedFeature();
    this.props.onHandleHighlightedFeaturesDifferential([], false);
  }

  getXAxisLabelY(upperPlotsHeight) {
    if (upperPlotsHeight < 300) {
      return upperPlotsHeight - 19;
    } else if (upperPlotsHeight > 500) {
      return upperPlotsHeight - 10;
    } else return upperPlotsHeight - 15;
  }

  getMaxAndMin(data, element) {
    if (data?.length > 0 && data[0][element] != null) {
      var values = [data[0][element], data[0][element]];
      for (var i = 1; i < data.length; i++) {
        if (data[i] != null && data[i][element] != null) {
          if (data[i][element] > values[1]) {
            values[1] = data[i][element];
          } else if (data[i][element] < values[0]) {
            values[0] = data[i][element];
          }
        }
      }
      return values;
    } else return [0, 0];
  }

  render() {
    return (
      <div
        id="volcano"
        className={this.props.volcanoPlotVisible ? 'Show' : 'Hide'}
      >
        {this.state.volcanoCircleText}
      </div>
    );
  }
}
export default ScatterPlot;
