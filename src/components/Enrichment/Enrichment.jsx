import React, { Component } from 'react';
import { Grid, Popup, Sidebar } from 'semantic-ui-react';
import { withRouter } from 'react-router-dom';
import EnrichmentSearchCriteria from './EnrichmentSearchCriteria';
import EnrichmentNetworkGraph from './EnrichmentNetworkGraph';
import EnrichmentResults from './EnrichmentResults';
import TransitionActive from '../Transitions/TransitionActive';
import TransitionStill from '../Transitions/TransitionStill';
import ButtonActions from '../Shared/ButtonActions';
import {
  formatNumberForDisplay,
  splitValue,
  getIconInfo
} from '../Shared/helpers';
// import { phosphoprotService } from '../services/phosphoprot.service';
import _ from 'lodash';
import './Enrichment.scss';
import '../Shared/Table.scss';
import msig_icon from '../../resources/msig.ico';
import phosphosite_icon from '../../resources/phosphosite.ico';
import reactome_icon from '../../resources/reactome.jpg';
import go_icon from '../../resources/go.png';

class Enrichment extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isValidSearchEnrichment: false,
      isSearching: false,
      enrichmentIcon: '',
      enrichmentIconText: '',
      // annotationData: [],
      enrichmentResults: [],
      enrichmentColumns: [],
      enrichmentView: 'table',
      networkDataAvailable: false,
      networkData: {},
      multisetPlotInfo: {
        title: '',
        svg: []
      },
      multisetPlotAvailable: false,
      animation: 'uncover',
      direction: 'left',
      visible: false,
      plotButtonActive: false,
      uData: [],
      excelVisible: false,
      pngVisible: true,
      pdfVisible: false,
      svgVisible: true
    };
  }

  componentDidMount() {}

  handleSearchTransition = () => {
    this.setState({
      isSearching: true
    });
  };

  handleEnrichmentSearch = searchResults => {
    const columns = this.getConfigCols(searchResults);
    this.setState({
      enrichmentResults: searchResults.enrichmentResults,
      enrichmentColumns: columns,
      isSearching: false,
      isValidSearchEnrichment: true,
      plotButtonActive: false,
      visible: false
    });
  };

  handleSearchCriteriaChange = (changes, scChange) => {
    this.props.onSearchCriteriaToTop(changes, 'enrichment');
    this.setState({
      // enrichmentView: 'table',
      plotButtonActive: false,
      visible: false
    });
    if (scChange) {
      this.setState({
        multisetPlotAvailable: false
      });
    }
  };

  disablePlot = () => {
    this.setState({
      multisetPlotAvailable: false
    });
  };

  hideEGrid = () => {
    this.setState({
      isValidSearchEnrichment: false,
      multisetPlotAvailable: false,
      plotButtonActive: false,
      visible: false
    });
  };

  handlePlotAnimation = animation => () => {
    this.setState(prevState => ({
      animation,
      visible: !prevState.visible,
      plotButtonActive: !this.state.plotButtonActive
    }));
  };

  handleDirectionChange = direction => () =>
    this.setState({ direction: direction, visible: false });

  handleMultisetPlot = multisetPlotResults => {
    this.setState({
      multisetPlotInfo: {
        title: multisetPlotResults.svgInfo.plotType,
        svg: multisetPlotResults.svgInfo.svg
      },
      multisetPlotAvailable: true
    });
  };

  getConfigCols = annotationData => {
    const enrResults = annotationData.enrichmentResults;
    const {
      enrichmentStudy,
      enrichmentModel,
      enrichmentAnnotation
    } = this.props;
    let initConfigCols = [];

    const TableValuePopupStyle = {
      backgroundColor: '2E2E2E',
      borderBottom: '2px solid #FF4400',
      color: '#FFF',
      padding: '1em',
      maxWidth: '50vw',
      fontSize: '13px',
      wordBreak: 'break-all'
    };

    let icon = '';
    let iconText = '';
    // let dbShort = '';
    if (enrichmentAnnotation === 'REACTOME') {
      icon = reactome_icon;
      iconText = 'Reactome';
      // dbShort = 'REACTOME';
    } else if (enrichmentAnnotation.substring(0, 2) === 'GO') {
      icon = go_icon;
      iconText = 'AmiGO 2';
      if (enrichmentAnnotation.substring(3, 4) === 'B') {
        // dbShort = 'GOBP';
      } else if (enrichmentAnnotation.substring(3, 4) === 'C') {
        // dbShort = 'GOCC';
      } else if (enrichmentAnnotation.substring(3, 4) === 'M') {
        // dbShort = 'GOMF';
      }
    } else if (enrichmentAnnotation.substring(0, 4) === 'msig') {
      icon = msig_icon;
      iconText = 'GSEA MSigDB';
    } else if (enrichmentAnnotation === 'PSP') {
      icon = phosphosite_icon;
      iconText = 'PhosphoSitePlus';
    }

    this.setState({
      enrichmentIcon: icon,
      enrichmentIconText: iconText
    });

    let allKeys = _.keys(enrResults[0]);

    let ***REMOVED***_text_col = _.indexOf(allKeys, 'name_1006');
    if (***REMOVED***_text_col >= 0) {
      const Col_Name_1006 = {
        title: 'name_1006',
        field: 'name_1006',
        filterable: { type: 'alphanumericFilter' },
        template: (value, item, addParams) => {
          return (
            <div>
              <Popup
                trigger={
                  <span className="TableValue">{splitValue(value)}</span>
                }
                style={TableValuePopupStyle}
                className="TablePopupValue"
                content={value}
                inverted
                basic
              />
            </div>
          );
        }
      };
      initConfigCols.push(Col_Name_1006);
    }

    let descripton_text_col = _.indexOf(allKeys, 'Description');
    if (descripton_text_col >= 0) {
      const Col_Name_Description = {
        title: 'Description',
        field: 'Description',
        filterable: { type: 'alphanumericFilter' },
        template: (value, item, addParams) => {
          return (
            <div>
              <Popup
                trigger={
                  <span className="TableValue">{splitValue(value)}</span>
                }
                style={TableValuePopupStyle}
                className="TablePopupValue"
                content={value}
                inverted
                basic
              />
              <Popup
                trigger={
                  <img
                    src={icon}
                    alt={iconText}
                    className="ExternalSiteIcon"
                    onClick={addParams.getLink(
                      enrichmentStudy,
                      enrichmentAnnotation,
                      item
                    )}
                  />
                }
                style={TableValuePopupStyle}
                className="TablePopupValue"
                content={iconText}
                inverted
                basic
              />
            </div>
          );
        }
      };
      initConfigCols.push(Col_Name_Description);
    }

    let annotation_text_col = _.indexOf(allKeys, 'Annotation');
    if (annotation_text_col >= 0) {
      const Col_Name_Annotation = {
        title: 'Annotation',
        field: 'Annotation',
        filterable: { type: 'alphanumericFilter' },
        template: (value, item, addParams) => {
          return (
            <div>
              <Popup
                trigger={
                  <span className="TableValue">{splitValue(value)}</span>
                }
                style={TableValuePopupStyle}
                className="TablePopupValue"
                content={value}
                inverted
                basic
              />
            </div>
          );
        }
      };
      initConfigCols.push(Col_Name_Annotation);
    }

    const relevantConfigColumns = _.filter(allKeys, function(key) {
      return (
        key !== 'name_1006' && key !== 'Description' && key !== 'Annotation'
      );
    });

    const uDataRelevantFields = _.filter(allKeys, function(key) {
      return key !== 'Description' && key !== 'Annotation';
    });
    // multiset svg rebuilds based on uData...if there are no results we need to override this from being passed down
    if (uDataRelevantFields.length !== 0) {
      this.setState({
        uData: uDataRelevantFields
      });
    }

    const additionalConfigColumns = relevantConfigColumns.map(c => {
      return {
        title: c,
        field: c,
        type: 'number',
        filterable: { type: 'numericFilter' },
        exportTemplate: value => (value ? `${value}` : 'N/A'),
        template: (value, item, addParams) => {
          if (enrichmentStudy === '***REMOVED***') {
            return (
              <div>
                <Popup
                  trigger={
                    <span
                      className="TableCellLink"
                      onClick={addParams.barcodeData(
                        enrichmentStudy,
                        enrichmentModel,
                        enrichmentAnnotation,
                        item,
                        c
                      )}
                    >
                      {formatNumberForDisplay(value)}
                    </span>
                  }
                  style={TableValuePopupStyle}
                  className="TablePopupValue"
                  content={value}
                  inverted
                  basic
                />
              </div>
            );
          } else
            return (
              <div>
                <Popup
                  trigger={
                    <span className="TableValue">
                      {formatNumberForDisplay(value)}
                    </span>
                  }
                  style={TableValuePopupStyle}
                  className="TablePopupValue"
                  content={value}
                  inverted
                  basic
                />
              </div>
            );
        }
      };
    });

    const configCols = initConfigCols.concat(additionalConfigColumns);
    return configCols;
  };

  handleEnrichmentViewChange = choice => {
    return evt => {
      this.setState({
        enrichmentView: choice.enrichmentView
      });
    };
  };

  // getNetworkData = () => {
  //   phosphoprotService.getEnrichmentMap().then(EMData => {
  //     this.setState({
  //       networkDataAvailable: true,
  //       nwData: EMData.elements
  //     });
  //   });
  // };

  getView = () => {
    if (
      this.state.isValidSearchEnrichment &&
      !this.state.isSearching &&
      this.state.enrichmentView === 'table'
    ) {
      return (
        <EnrichmentResults
          {...this.props}
          {...this.state}
          onSearchCriteriaChange={this.handleSearchCriteriaChange}
          onEnrichmentViewChange={this.handleEnrichmentViewChange}
          onHandlePlotAnimation={this.handlePlotAnimation}
        />
      );
    } else if (
      this.state.isValidSearchEnrichment &&
      !this.state.isSearching &&
      this.state.enrichmentView === 'network'
    ) {
      return (
        <EnrichmentNetworkGraph
          {...this.props}
          {...this.state}
          onEnrichmentViewChange={this.handleEnrichmentViewChange}
          onHandlePlotAnimation={this.handlePlotAnimation}
        />
      );
    } else if (this.state.isSearching) {
      return <TransitionActive />;
    } else return <TransitionStill />;
  };

  render() {
    const enrichmentView = this.getView(this.state);

    const { multisetPlotInfo, animation, direction, visible } = this.state;
    const VerticalSidebar = ({ animation, visible }) => (
      <Sidebar
        as={'div'}
        animation={animation}
        direction={direction}
        icon="labeled"
        vertical="true"
        visible={visible}
        width="very wide"
        className="VerticalSidebarPlot"
      >
        <Grid className="">
          <Grid.Row className="ActionsRow">
            <Grid.Column
              mobile={16}
              tablet={16}
              largeScreen={16}
              widescreen={16}
            >
              <ButtonActions {...this.props} {...this.state} />
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <div
          className="MultisetSvgSpan"
          id="MultisetSvgOuter"
          dangerouslySetInnerHTML={{ __html: multisetPlotInfo.svg }}
        ></div>
      </Sidebar>
    );

    // networkGraphData = this.getNetworkData();
    // networkData will be used for Network Graph

    return (
      <Grid.Row className="EnrichmentContainer">
        <Grid.Column
          className="SidebarContainer"
          mobile={16}
          tablet={16}
          largeScreen={4}
          widescreen={4}
        >
          <EnrichmentSearchCriteria
            {...this.state}
            {...this.props}
            onSearchTransition={this.handleSearchTransition}
            onEnrichmentSearch={this.handleEnrichmentSearch}
            onSearchCriteriaChange={this.handleSearchCriteriaChange}
            onSearchCriteriaReset={this.hideEGrid}
            onDisablePlot={this.disablePlot}
            onGetMultisetPlot={this.handleMultisetPlot}
            onHandlePlotAnimation={this.handlePlotAnimation}
          />
        </Grid.Column>
        <Grid.Column
          className="ContentContainer"
          mobile={16}
          tablet={16}
          largeScreen={12}
          widescreen={12}
        >
          <Sidebar.Pushable as={'span'}>
            <VerticalSidebar
              animation={animation}
              direction={direction}
              visible={visible}
            />
            <Sidebar.Pusher>{enrichmentView}</Sidebar.Pusher>
          </Sidebar.Pushable>
        </Grid.Column>
      </Grid.Row>
    );
  }
}

export default withRouter(Enrichment);