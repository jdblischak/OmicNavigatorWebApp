import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { Grid, Dimmer, Loader } from 'semantic-ui-react';
import DifferentialBreadcrumbs from './DifferentialBreadcrumbs';
import ButtonActions from '../Shared/ButtonActions';
import DifferentialPlotTabs from './DifferentialPlotTabs';
import '../Enrichment/SplitPanesContainer.scss';
import './DifferentialPlot.scss';

class DifferentialPlot extends Component {
  static defaultProps = {
    // isProteinDataLoaded: false,
    isProteinSVGLoaded: true,
  };

  state = {
    activeDifferentialPlotTabsIndex: 0,
    excelVisible: true,
    pngVisible: true,
    pdfVisible: false,
    svgVisible: true,
  };

  componentDidMount() {
    this.setButtonVisibility(this.state.activeDifferentialPlotTabsIndex);
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.state.activeDifferentialPlotTabsIndex !==
      prevState.activeDifferentialPlotTabsIndex
    ) {
      this.setButtonVisibility(this.state.activeDifferentialPlotTabsIndex);
    }
  }

  handleDifferentialPlotTabChange = activeTabIndex => {
    this.setState({
      activeDifferentialPlotTabsIndex: activeTabIndex,
    });
  };

  setButtonVisibility = index => {
    this.setState({
      // excelVisible: index === 2,
      // excel not ready yet
      excelVisible: false,
      // pdfVisible: index !== 2,
      pdfVisible: false,
      svgVisible: index !== 2,
      pngVisible: index !== 2,
    });
  };

  render() {
    // const { activeDifferentialPlotTabsIndex } = this.state;
    const { isProteinSVGLoaded } = this.props;
    if (!isProteinSVGLoaded) {
      return (
        <div>
          <Dimmer active inverted>
            <Loader size="large">Loading Plots...</Loader>
          </Dimmer>
        </div>
      );
    } else {
      return (
        <div className="PlotWrapper">
          <Grid columns={2} className="">
            <Grid.Row className="ActionsRow">
              <Grid.Column mobile={8} tablet={8} largeScreen={8} widescreen={8}>
                <DifferentialBreadcrumbs {...this.props} />
              </Grid.Column>
              <Grid.Column mobile={8} tablet={8} largeScreen={8} widescreen={8}>
                <ButtonActions {...this.props} {...this.state} />
              </Grid.Column>
            </Grid.Row>
          </Grid>

          <Grid columns={2} className="PlotContainer">
            <Grid.Row className="PlotContainerRow">
              <Grid.Column
                mobile={16}
                tablet={16}
                largeScreen={16}
                widescreen={16}
              >
                <DifferentialPlotTabs
                  {...this.props}
                  {...this.state}
                  onDifferentialPlotTableChange={
                    this.handleDifferentialPlotTabChange
                  }
                />
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </div>
      );
    }
  }
}

export default withRouter(DifferentialPlot);