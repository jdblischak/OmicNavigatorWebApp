import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { Grid, Dimmer, Loader, Button, Tab } from 'semantic-ui-react';
import EnrichmentBreadcrumbs from './EnrichmentBreadcrumbs';
import ButtonActions from '../Shared/ButtonActions';
// import PlotSVG from './PlotSVG';
import SplitPane from 'react-split-pane';
import './SplitPanesContainer.scss';
import SVGPlot from '../Shared/SVGPlot';
import BarcodePlot from './BarcodePlot';
import ViolinPlot from './ViolinPlot';
import FilteredPepplotTable from './FilteredPepplotTable';

class SplitPanesContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      activeSVGTabIndex: 0,
      proteinForDiffView: '',
      barcodeSplitPaneSize:
        parseInt(localStorage.getItem('barcodeSplitPos'), 10) || 250,
      activeViolinTableIndex: 0
    };
  }

  componentDidMount() {}

  handleSVGTabChange = activeTabIndex => {
    this.setState({
      activeSVGTabIndex: activeTabIndex
    });
  };

  setProteinForDiffView = proteinSite => {
    this.setState({
      proteinForDiffView: proteinSite
    });
  };

  getBarcodePlot = () => {
    const { isTestDataLoaded } = this.props;

    if (!isTestDataLoaded) {
      return (
        <div>
          <Dimmer active inverted>
            <Loader size="large">Barcode Plot is Loading</Loader>
          </Dimmer>
        </div>
      );
    } else {
      return (
        <BarcodePlot
          className="BarcodePlotContainer"
          {...this.state}
          {...this.props}
          onSetProteinForDiffView={this.setProteinForDiffView}
        />
      );
    }
  };

  getViolinPlot = () => {
    const {
      isViolinPlotLoading,
      isViolinPlotLoaded,
      violinData,
      violinSettings
    } = this.props;
    // isViolinPlotLoaded
    if (!isViolinPlotLoading && !isViolinPlotLoaded) {
      return (
        <div className="PlotInstructionsDiv">
          <h4 className="PlotInstructionsText">
            Select barcode line/s to display Violin Plot
          </h4>
        </div>
      );
    } else if (isViolinPlotLoading) {
      return (
        <Dimmer active inverted>
          <Loader size="large">Violin Plot is Loading</Loader>
        </Dimmer>
      );
    } else {
      return (
        <ViolinPlot
          className="ViolinPlotContainer"
          {...this.state}
          {...this.props}
        />
      );
    }
  };

  handleViolinTableTabChange = (e, { activeIndex }) => {
    this.setState({
      activeViolinTableIndex: activeIndex
    });
  };

  getViolinAndTable = () => {
    const { activeViolinTableIndex } = this.state;
    const violinPlot = this.getViolinPlot();
    const violinAndTablePanes = [
      {
        menuItem: 'Violin Plot',
        pane: (
          <Tab.Pane
            attached="true"
            key="1"
            id="ViolinPlotTab"
            className="ViolinPlotTab"
            // as="div"
          >
            <div id="" className="">
              {violinPlot}
            </div>
          </Tab.Pane>
        )
      },
      {
        menuItem: 'Table Results',
        pane: (
          <Tab.Pane
            attached="true"
            key="2"
            id="TableResultsTab"
            className="TableResultsTab"
            // as="div"
          >
            <FilteredPepplotTable {...this.state} {...this.props} />
          </Tab.Pane>
        )
      }
    ];

    return (
      <Tab
        onTabChange={this.handleViolinTableTabChange}
        panes={violinAndTablePanes}
        activeIndex={activeViolinTableIndex}
        renderActiveOnly={false}
        menu={{
          stackable: true,
          secondary: true,
          pointing: true,
          className: 'ViolinAndTableMenu'
        }}
      />
    );
  };

  getSVGPlot = () => {
    const tabChangeCb = this.handleSVGTabChange;
    const { SVGPlotLoaded, SVGPlotLoading } = this.props;
    if (!SVGPlotLoaded & !SVGPlotLoading) {
      return (
        <div className="PlotInstructionsDiv">
          <h4 className="PlotInstructionsText">
            Select barcode line/s to display SVG Plot
          </h4>
        </div>
      );
    } else if (!SVGPlotLoaded & SVGPlotLoading) {
      return (
        <Dimmer active inverted>
          <Loader size="large">SVG Plot is Loading</Loader>
        </Dimmer>
      );
    } else {
      return (
        <SVGPlot {...this.props} {...this.state} onSVGTabChange={tabChangeCb} />
      );
    }
  };

  barcodeSplitPaneResized(size) {
    this.setState({
      barcodeSplitPaneSize: size
    });
    localStorage.setItem('barcodeSplitPos', size);
  }

  render() {
    const BarcodePlot = this.getBarcodePlot();
    const ViolinAndTable = this.getViolinAndTable();
    const SVGPlot = this.getSVGPlot();

    // if (!isTestDataLoaded) {
    //   return (
    //     <div>
    //       <Dimmer active inverted>
    //         <Loader size="large">Barcode, Violin, Dot Plots are Loading</Loader>
    //       </Dimmer>
    //     </div>
    //   );
    // } else {
    if (this.props.displayViolinPlot) {
      return (
        <div className="PlotsWrapper">
          <Grid className="">
            <Grid.Row className="ActionsRow">
              <Grid.Column
                mobile={16}
                tablet={16}
                largeScreen={12}
                widescreen={12}
              >
                <EnrichmentBreadcrumbs {...this.props} />
              </Grid.Column>
              {/* <Grid.Column mobile={16} tablet={16} largeScreen={4} widescreen={4}>
                <Button primary className="ViewDiffTableButton" onClick={this.props.onViewDiffTable}>
                  View Differential Table
                </Button>
              </Grid.Column> */}
              {/* <Grid.Column mobile={8} tablet={8} largeScreen={8} widescreen={8}>
                <ButtonActions {...this.props} {...this.state} />
              </Grid.Column> */}

              <Grid.Column
                mobile={16}
                tablet={16}
                largeScreen={16}
                widescreen={16}
              >
                <SplitPane
                  className="ThreePlotsDiv SplitPanesWrapper"
                  split="horizontal"
                  defaultSize={this.state.barcodeSplitPaneSize}
                  minSize={200}
                  maxSize={300}
                  onChange={size => this.barcodeSplitPaneResized(size)}
                >
                  {BarcodePlot}
                  <SplitPane
                    split="vertical"
                    defaultSize={400}
                    minSize={300}
                    maxSize={700}
                  >
                    <div id="ViolinAndTableSplitContainer">
                      {ViolinAndTable}
                    </div>
                    <div id="SVGSplitContainer">{SVGPlot}</div>
                  </SplitPane>
                </SplitPane>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </div>
      );
    } else {
      return (
        <div className="PlotsWrapper">
          <Grid className="">
            <Grid.Row className="ActionsRow">
              <Grid.Column
                mobile={16}
                tablet={16}
                largeScreen={16}
                widescreen={16}
              >
                <EnrichmentBreadcrumbs {...this.props} />
              </Grid.Column>
              {/* <Grid.Column mobile={8} tablet={8} largeScreen={8} widescreen={8}>
                <ButtonActions {...this.props} {...this.state} />
              </Grid.Column> */}
              <Grid.Column
                mobile={16}
                tablet={16}
                largeScreen={16}
                widescreen={16}
              >
                <SplitPane
                  className="TwoPlotsDiv SplitPanesWrapper"
                  split="horizontal"
                  defaultSize={this.state.barcodeSplitPaneSize}
                  minSize={200}
                  maxSize={300}
                  onChange={size => this.barcodeSplitPaneResized(size)}
                >
                  {BarcodePlot}
                  <div id="SVGSplitContainer">{SVGPlot}</div>
                </SplitPane>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </div>
      );
    }
  }
}

export default withRouter(SplitPanesContainer);
