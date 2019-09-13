import React, { Component } from 'react';
import { Grid, Popup } from 'semantic-ui-react';
import { withRouter } from 'react-router-dom';
import PepplotSearchCriteria from './PepplotSearchCriteria';
import PepplotResults from './PepplotResults';
import TransitionStill from './TransitionStill';
import TransitionActive from './TransitionActive';
import { formatNumberForDisplay, splitValue } from '../helpers';

import _ from 'lodash';
import './Pepplot.scss';
import './Table.scss';

class PepplotContainer extends Component {
  static defaultProps = {
    tab: 'pepplot'
  };

  state = {
    isValidSearchPepplot: false,
    isSearching: false,
    isProteinSelected: false,
    pepplotResults: [],
    pepplotColumns: []
  };

  componentDidMount() {}

  handleSearchTransition = () => {
    this.setState({
      isSearching: true
    });
  };

  handlePepplotSearch = searchResults => {
    const columns = this.getConfigCols(searchResults);
    this.setState({
      study: searchResults.study,
      model: searchResults.model,
      test: searchResults.test,
      pepplotResults: searchResults.pepplotResults,
      pepplotColumns: columns,
      isSearching: false,
      isValidSearchPepplot: true,
      isProteinSelected: false
    });
  };

  hidePGrid = () => {
    this.setState({
      isValidSearchPepplot: false
    });
  };

  getConfigCols = testData => {
    this.testData = testData.pepplotResults;
    const model = testData.model;
    let initConfigCols = [];

    // const TableValuePopupStyle = {
    //   backgroundColor: '2E2E2E',
    //   borderBottom: '2px solid #FF4400',
    //   color: '#FFF',
    //   padding: '1em',
    //   maxWidth: '50vw',
    //   fontSize: '13px',
    //   wordBreak: 'break-all'
    // };

    if (model === 'Differential Expression') {
      initConfigCols = [
        {
          title: 'MajorityProteinIDsHGNC',
          field: 'MajorityProteinIDsHGNC',
          filterable: { type: 'alphanumericFilter' },
          template: (value, item, addParams) => {
            return (
              <div>
                <Popup
                  trigger={
                    <span
                      className="ProteinNameLink"
                      onClick={addParams.showPlot(model, item)}
                    >
                      {splitValue(value)}
                    </span>
                  }
                  content={value}
                  // style={TableValuePopupStyle}
                  className="TablePopupValue"
                  inverted
                  basic
                />
                <img
                  src="phosphosite.ico"
                  alt="Phosophosite"
                  className="PhosphositeIcon"
                  onClick={addParams.showPhosphositePlus(item)}
                />
              </div>
            );
          }
        },
        {
          title: 'MajorityProteinIDs',
          field: 'MajorityProteinIDs',
          filterable: { type: 'alphanumericFilter' },
          template: (value, item, addParams) => {
            return (
              <Popup
                trigger={
                  <span className="TableValue">{splitValue(value)}</span>
                }
                content={value}
                // style={TableValuePopupStyle}
                className="TablePopupValue"
                inverted
                basic
              />
            );
          }
        }
      ];
    } else {
      initConfigCols = [
        {
          title: 'Protein_Site',
          field: 'Protein_Site',
          filterable: { type: 'alphanumericFilter' },
          template: (value, item, addParams) => {
            return (
              <p>
                <Popup
                  trigger={
                    <span
                      className="ProteinNameLink"
                      onClick={addParams.showPlot(model, item)}
                    >
                      {splitValue(value)}
                    </span>
                  }
                  // style={TableValuePopupStyle}
                  className="TablePopupValue"
                  content={value}
                  inverted
                  basic
                />
                <img
                  src="phosphosite.ico"
                  alt="Phosophosite"
                  className="PhosphositeIcon"
                  onClick={addParams.showPhosphositePlus(item)}
                />
              </p>
            );
          }
        }
      ];
    }

    let allConfigCols = ['F', 'logFC', 't', 'P_Value', 'adj_P_Val', 'adjPVal'];
    let orderedTestData = JSON.parse(
      JSON.stringify(this.testData[0], allConfigCols)
    );
    let relevantConfigColumns = _.map(
      _.filter(_.keys(orderedTestData), function(d) {
        return _.includes(allConfigCols, d);
      })
    );

    const additionalConfigColumns = relevantConfigColumns.map(c => {
      return {
        title: c,
        field: c,
        type: 'number',
        filterable: { type: 'numericFilter' },
        exportTemplate: value => (value ? `${value}` : 'N/A'),
        template: (value, item, addParams) => {
          return (
            <p>
              <Popup
                trigger={
                  <span className="TableValue">
                    {formatNumberForDisplay(value)}
                  </span>
                }
                // style={TableValuePopupStyle}
                className="TablePopupValue"
                content={value}
                inverted
                basic
              />
            </p>
          );
        }
      };
    });

    const configCols = initConfigCols.concat(additionalConfigColumns);

    return configCols;
  };

  getView = () => {
    if (
      this.state.isValidSearchPepplot &&
      !this.state.isProteinSelected &&
      !this.state.isSearching
    ) {
      return <PepplotResults {...this.state} />;
    } else if (this.state.isSearching) {
      return <TransitionActive />;
    } else return <TransitionStill />;
  };

  render() {
    const pepplotView = this.getView(this.state);
    return (
      <Grid.Row className="PepplotContainer">
        <Grid.Column
          className="SidebarContainer"
          mobile={16}
          tablet={16}
          largeScreen={4}
          widescreen={4}
        >
          <PepplotSearchCriteria
            {...this.state}
            onSearchTransition={this.handleSearchTransition}
            onPepplotSearch={this.handlePepplotSearch}
            onSearchCriteriaReset={this.hidePGrid}
          />
        </Grid.Column>
        <Grid.Column
          className="ContentContainer"
          mobile={16}
          tablet={16}
          largeScreen={12}
          widescreen={12}
        >
          {pepplotView}
        </Grid.Column>
      </Grid.Row>
    );
  }
}

export default withRouter(PepplotContainer);
