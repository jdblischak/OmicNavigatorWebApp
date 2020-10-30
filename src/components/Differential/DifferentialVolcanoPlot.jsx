import React, { Component } from 'react';
import './DifferentialVolcanoPlot.scss';
import * as d3 from 'd3';
import ButtonActions from '../Shared/ButtonActions';

class DifferentialVolcanoPlot extends Component {
  state = {
    plotName: 'differentialVolcanoPlot',
    hoveredCircleData: {
      position: [],
      id: null,
      xstat: null,
      ystat: null,
    },
    hovering: false,
    hoveredTextScalar: 12,
    tooltipPosition: null,
    brushedCirclesData: [],
    brushing: false,
    resizeScalarX: 1,
    resizeScalarY: 1,
  };

  volcanoSVGRef = React.createRef();

  componentDidUpdate(prevProps) {
    const {
      volcanoDifferentialTableRowOther,
      volcanoDifferentialTableRowMax,
    } = this.props;
    if (
      volcanoDifferentialTableRowOther !==
        prevProps.volcanoDifferentialTableRowOther ||
      volcanoDifferentialTableRowMax !==
        prevProps.volcanoDifferentialTableRowMax
    ) {
      const circles = d3.selectAll('circle.volcanoPlot-dataPoint').attr('r', 2);
      circles.classed('highlighted', false);
      circles.classed('highlightedMax', false);
      if (volcanoDifferentialTableRowOther.length > 0) {
        volcanoDifferentialTableRowOther.forEach(element => {
          const highlightedCircleId = document.getElementById(
            `volcanoDataPoint-${element}`,
          );
          const highlightedCircle = d3.select(highlightedCircleId);
          if (highlightedCircle != null) {
            highlightedCircle.attr('r', 3);
            highlightedCircle.classed('highlighted', true);
            highlightedCircle.raise();
          }
        });
      }
      if (volcanoDifferentialTableRowMax.length > 0) {
        const maxCircleId = document.getElementById(
          `volcanoDataPoint-${volcanoDifferentialTableRowMax}`,
        );
        const maxCircle = d3.select(maxCircleId);
        if (maxCircle != null) {
          maxCircle.attr('r', 5);
          maxCircle.classed('highlightedMax', true);
          maxCircle.raise();
        }
      }
    }
  }
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
    circles.classed('selected', false);
    circles.classed('highlighted', false);
  };
  handleCircleHover = e => {
    const hoveredData = {
      id: e.target.attributes['circleid'].value,
      xstat: e.target.attributes['xstatistic'].value,
      ystat: e.target.attributes['ystatistic'].value,
      position: [
        e.target.attributes['cx'].value,
        e.target.attributes['cy'].value,
      ],
    };
    const hovered = document.getElementById(
      `volcanoDataPoint-${e.target.attributes['circleid'].value}`,
    );
    const circle = d3.select(hovered) ?? null;
    if (circle != null) {
      circle.classed('hovered', true).raise();
      this.setState({
        hoveredCircleData: hoveredData,
        hovering: true,
      });
    }
  };
  handleCircleLeave() {
    d3.selectAll('circle.volcanoPlot-dataPoint').classed('hovered', false);
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
  getToolTip() {
    const { hoveredCircleData, hovering } = this.state;
    const {
      xAxisLabel,
      yAxisLabel,
      identifier,
      doXAxisTransformation,
      doYAxisTransformation,
    } = this.props;

    if (hovering) {
      const idText = identifier + ': ' + hoveredCircleData.id;
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
      return (
        <svg
          x={
            hoveredCircleData.position[0] >= 240
              ? hoveredCircleData.position[0] * 1 - 170
              : hoveredCircleData.position[0] * 1 + 15
          }
          y={hoveredCircleData.position[1] * 1 + 10}
          width="150"
          height="75"
        >
          <rect width="100%" height="100%" fill="#ff4400" rx="5" ry="5"></rect>
          <rect
            width="100%"
            height="95%"
            fill="#2e2e2e"
            stroke="black"
            rx="3"
            ry="3"
          ></rect>
          <text
            fontSize="13px"
            fill="white"
            fontFamily="Lato, Helvetica Neue, Arial, Helvetica, sans-serif"
            textAnchor="left"
          >
            <tspan x={15} y={23}>
              {idText}
            </tspan>
            <tspan x={15} y={23 + 16}>
              {xText}
            </tspan>
            <tspan x={15} y={23 + 16 * 2}>
              {yText}
            </tspan>
          </text>
        </svg>
      );
    } else {
      return null;
    }
  }

  setupBrush(width, height) {
    const self = this;
    let objsBrush = {};

    const brushingStart = function() {
      self.setState({
        brushing: true,
        hoveredCircleData: {
          position: [],
          id: null,
          xstat: null,
          ystat: null,
        },
      });
    };
    const endBrush = function() {
      // self.props.onHandleVolcanoTableLoading(true);
      if (d3.event.selection != null) {
        const brushedCircles = d3.brushSelection(this);
        const isBrushed = function(x, y) {
          const brushTest =
            brushedCircles[0][0] <= x &&
            x <= brushedCircles[1][0] &&
            brushedCircles[0][1] <= y &&
            y <= brushedCircles[1][1];
          return brushTest;
        };

        const circles = d3
          .selectAll('circle.volcanoPlot-dataPoint')
          .classed('selected', false);

        const brushed = circles
          .filter(function() {
            const x = d3.select(this).attr('cx');
            const y = d3.select(this).attr('cy');
            return isBrushed(x, y);
          })
          .classed('selected', true);

        const brushedDataArr = brushed._groups[0].map(a => {
          return JSON.parse(a.attributes.data.value);
        });
        if (brushedDataArr.length > 0) {
          self.setState({ brushedCirclesData: brushedDataArr });
        }
        self.props.handleVolcanoPlotSelectionChange(brushedDataArr);
      } else {
        self.handleSVGClick(null);
      }
    };

    if (d3.selectAll('.brush').nodes().length > 0) {
      d3.selectAll('.brush').remove();
    }
    objsBrush = d3
      .brush()
      .extent([
        [-100, -20],
        [width + 100, height + 20],
      ])
      .on('start', brushingStart)
      .on('end', endBrush);

    d3.selectAll('.volcanoPlotD3BrushSelection').call(objsBrush);
    const brush = d3
      .select('.volcanoPlotD3BrushSelection')
      .selectAll('rect.selection');
    if (
      brush.nodes().length !== 0 &&
      brush.nodes()[0].getAttribute('x') !== null &&
      (self.state.resizeScalarX !== 1 || self.state.resizeScalarY !== 1)
    ) {
      d3.select('.volcanoPlotD3BrushSelection').call(objsBrush.move, [
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
      });
    }
  }

  handleSVGClick() {
    // this.props.onHandleVolcanoTableLoading(true);
    this.unhighlightBrushedCircles();
    this.props.handleVolcanoPlotSelectionChange([]);
    this.setState({
      brushing: false,
      resizeScalarX: 1,
      resizeScalarY: 1,
    });
  }

  // getRadius(val) {
  //   const otherFeatures = this.props.volcanoDifferentialTableRowOther.includes(
  //     val,
  //   );
  //   if (val === this.props.volcanoDifferentialTableRowMax) {
  //     return 5;
  //   } else if (otherFeatures) {
  //     return 4;
  //   } else return 2;
  // }

  render() {
    const {
      differentialResults,
      volcanoWidth,
      volcanoHeight,
      differentialResultsUnfiltered,
      xAxisLabel,
      yAxisLabel,
      identifier,
      doXAxisTransformation,
      doYAxisTransformation,
    } = this.props;

    if (differentialResultsUnfiltered.length === 0) {
      return null;
    }
    var xMM = this.props.getMaxAndMin(
      differentialResultsUnfiltered,
      xAxisLabel,
    );
    var yMM = this.props.getMaxAndMin(
      differentialResultsUnfiltered,
      yAxisLabel,
    );
    xMM = [this.doTransform(xMM[0], 'x'), this.doTransform(xMM[1], 'x')];
    yMM = [this.doTransform(yMM[0], 'y'), this.doTransform(yMM[1], 'y')];

    const xScale = d3
      .scaleLinear()
      .domain([Math.min(...xMM), Math.max(...xMM) * 1.1])
      .range([volcanoWidth * 0.1, volcanoWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([Math.min(...yMM), Math.max(...yMM) * 1.1])
      .range([volcanoHeight * 0.85, 0]);

    const yAxis = (
      <line
        className="volcanoPlotYAxis"
        x1={volcanoWidth * 0.1}
        x2={volcanoWidth * 0.1}
        y1={0}
        y2={volcanoHeight - volcanoHeight * 0.05}
      />
    );
    const xAxis = (
      <line
        className="volcanoPlotXAxis"
        x1={0}
        x2={volcanoWidth}
        y1={volcanoHeight - volcanoHeight * 0.15}
        y2={volcanoHeight - volcanoHeight * 0.15}
      />
    );

    const xAxisTicks = xScale.ticks().map(value => ({
      value,
      xOffset: xScale(value),
    }));

    const xPlotTicks = xAxisTicks.map(({ value, xOffset }) => (
      <g
        key={
          value !== undefined
            ? `xplotick-${value}-g`
            : `xplottick-${identifier}-g`
        }
        className="individualTick"
        transform={`translate(${xOffset}, ${volcanoHeight -
          volcanoHeight * 0.15})`}
      >
        <line y2="8" stroke="currentColor" />
        <text
          key={
            value !== undefined
              ? `xplottick-${value}-text`
              : `xplottick-${identifier}-text`
          }
          style={{
            fontSize: '12px',
            textAnchor: 'middle',
            transform: 'translateY(20px)',
          }}
        >
          {value}
        </text>
      </g>
    ));
    const yAxisTicks = yScale.ticks().map(value => ({
      value,
      yOffset: yScale(value),
    }));

    const yPlotTicks = yAxisTicks.map(({ value, yOffset }) => (
      <g
        key={
          value !== undefined
            ? `yplottick-${value}-g`
            : `yplottick-${identifier}-g`
        }
        className="individualTick"
        transform={`translate(0,${yOffset})`}
      >
        <line
          x1={volcanoWidth * 0.085}
          x2={volcanoWidth * 0.1}
          stroke="currentColor"
        />
        <text
          key={
            value !== undefined
              ? `yplottick-${value}-text`
              : `yplottick-${identifier}-text`
          }
          style={{
            fontSize: '12px',
            textAnchor: 'middle',
            transform: `translate(20px, 3px)`,
          }}
        >
          {value}
        </text>
      </g>
    ));
    var filteredOutPlotCircles = null;
    if (differentialResultsUnfiltered.length !== differentialResults.length) {
      filteredOutPlotCircles = differentialResultsUnfiltered.map(
        (val, index) => (
          <circle
            cx={`${xScale(this.doTransform(val[xAxisLabel], 'x'))}`}
            cy={`${yScale(this.doTransform(val[yAxisLabel], 'y'))}`}
            key={`${val[identifier] + '_' + index}`}
            r={2}
            opacity={0.3}
          ></circle>
        ),
      );
    }
    const plotCircles = differentialResults.map((val, index) => (
      <circle
        // r={this.getRadius(val[this.props.differentialFeatureIdKey])}
        r={2}
        className="volcanoPlot-dataPoint"
        id={`volcanoDataPoint-${val[identifier]}`}
        circleid={`${val[identifier]}`}
        key={`${val[identifier] + '_' + index}`}
        data={`${JSON.stringify(val)}`}
        onMouseEnter={e => this.handleCircleHover(e)}
        onMouseLeave={() => this.handleCircleLeave()}
        onClick={e =>
          this.props.onHandleDotClick(
            e,
            JSON.parse(e.target.attributes.data.value),
            0,
          )
        }
        xstatistic={`${this.doTransform(val[xAxisLabel], 'x')}`}
        ystatistic={`${this.doTransform(val[yAxisLabel], 'y')}`}
        cx={`${xScale(this.doTransform(val[xAxisLabel], 'x'))}`}
        cy={`${yScale(this.doTransform(val[yAxisLabel], 'y'))}`}
        cursor="pointer"
      ></circle>
    ));

    const hoveredCircleTooltip = this.getToolTip();

    this.setupBrush(volcanoWidth, volcanoHeight);

    const xAxisText = doXAxisTransformation
      ? '-log(' + xAxisLabel + ')'
      : xAxisLabel;
    const yAxisText = doYAxisTransformation
      ? '-log(' + yAxisLabel + ')'
      : yAxisLabel;

    if (identifier !== null && xAxisLabel !== null && yAxisLabel !== null) {
      return (
        <>
          <div id="VolcanoPlotDiv">
            <ButtonActions
              plot={this.state.plotName}
              excelVisible={false}
              pdfVisible={false}
              exportButtonSize="mini"
            />
          </div>
          <svg
            id="differentialVolcanoPlot"
            className="volcanoPlotSVG"
            width={volcanoWidth}
            height={volcanoHeight}
            ref={this.volcanoSVGRef}
            onClick={() => this.handleSVGClick()}
          >
            <g className="volcanoPlotD3BrushSelection" />
            {yAxis}
            {xAxis}
            {/*X Axis Label*/}
            <text
              className="volcanoAxisLabel"
              transform={`translate(${volcanoWidth / 2}, ${volcanoHeight})`}
            >
              {xAxisText}
            </text>
            {/*Y Axis Label*/}
            <text
              className="volcanoAxisLabel"
              transform={`rotate(-90,0,${volcanoHeight * 0.5})`}
              x="0"
              y={`${volcanoHeight * 0.5}`}
            >
              {yAxisText}
            </text>
            {xPlotTicks}
            {yPlotTicks}
            <filter id="constantOpacity">
              <feComponentTransfer>
                <feFuncA type="table" tableValues="0 .3 .3" />
              </feComponentTransfer>
            </filter>
            <g filter="url(#constantOpacity)">{filteredOutPlotCircles}</g>
            {plotCircles}
            {hoveredCircleTooltip}
          </svg>
        </>
      );
    } else {
      return null;
    }
  }
}
export default DifferentialVolcanoPlot;
