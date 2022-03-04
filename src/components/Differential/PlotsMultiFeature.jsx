import React, { Component } from 'react';
import {
  Loader,
  Dimmer,
  Tab,
  Popup,
  Icon,
  Label,
  Button,
  Dropdown,
  List,
} from 'semantic-ui-react';
import SVG from 'react-inlinesvg';
import { roundToPrecision } from '../Shared/helpers';
import ButtonActions from '../Shared/ButtonActions';
import PlotlyMultiFeature from './PlotlyMultiFeature';
import './PlotsDynamic.scss';
import '../Shared/PlotlyOverrides.scss';

class PlotsMultiFeature extends Component {
  state = {
    activeTabIndexPlotsMultiFeature: 0,
    excelFlagMFPlots: false,
    txtFlagMFPlots: false,
    pdfFlagMFPlots: false,
    svgFlagMFPlots: true,
    pngFlagMFPlots: true,
    featuresListOpen: false,
    plotlyExport: false,
    plotlyExportType: 'svg',
    isPlotlyPlot: true,
  };

  differentialDetailPlotsMultiFeatureRef = React.createRef();

  handleTabChangeMultiFeature = (e, { activeIndex }) => {
    this.setState({
      activeTabIndexPlotsMultiFeature: activeIndex,
    });
  };

  handlePlotDropdownChangeMultiFeature = (e, { value }) => {
    this.setState({
      activeTabIndexPlotsMultiFeature: value,
    });
  };

  toggleFeaturesListPopup = (e, obj, close) => {
    if (close) {
      this.setState({ featuresListOpen: false });
    } else {
      this.setState({ featuresListOpen: !this.state.featuresListOpen });
    }
  };

  clearAll = () => {
    this.setState({
      featuresListOpen: false,
    });
    this.props.onHandleAllChecked(false);
    this.props.onHandleHighlightedFeaturesDifferential([], false);
  };

  getFeaturesList = () => {
    const {
      divWidth,
      differentialHighlightedFeaturesData,
      plotMultiFeatureMax,
    } = this.props;
    let features = [];
    // const uniqueFeaturesHighlighted = [
    //   ...new Map(
    //     differentialHighlightedFeaturesData.map(item => [item.id, item]),
    //   ).values(),
    // ];
    const featuresHighlighted =
      differentialHighlightedFeaturesData?.length || null;
    if (featuresHighlighted > 10) {
      let shortenedArr = [...differentialHighlightedFeaturesData].slice(0, 10);
      features = shortenedArr.map(m => m.key);
    } else {
      if (featuresHighlighted > 0) {
        features = [...differentialHighlightedFeaturesData].map(m => m.key);
      }
    }
    const featuresListHorizontalStyle = {
      minWidth: divWidth * 0.9,
      maxWidth: divWidth * 0.9,
    };
    const manyFeaturesText =
      featuresHighlighted >= plotMultiFeatureMax ? (
        <span id="MoreThanText">
          Plotting is limited to the first {plotMultiFeatureMax} features
        </span>
      ) : (
        <span id="MoreThanText">
          {featuresHighlighted} features selected. Individual de-select disabled
          when 11+ features.
        </span>
      );

    let list = (
      <List
        animated
        inverted
        verticalAlign="middle"
        id="FeaturesListHorizontal"
        className="NoSelect"
        style={featuresListHorizontalStyle}
        divided
        horizontal
        size="mini"
      >
        <List.Item className="NoSelect">
          <Label
            className="PrimaryBackground CursorPointer"
            onClick={this.clearAll}
          >
            CLEAR ALL <Icon name="trash" />
          </Label>
          {featuresHighlighted > 10 ? manyFeaturesText : null}
        </List.Item>
        {featuresHighlighted > 10
          ? null
          : features.map(f => {
              return (
                <List.Item key={`featureList-${f}`} className="NoSelect">
                  <Label
                    className="CursorPointer"
                    onClick={() => this.props.onRemoveSelectedFeature(f)}
                  >
                    {f}
                    <Icon name="delete" />
                  </Label>
                </List.Item>
              );
            })}
      </List>
    );

    let div = (
      <span
        className={divWidth < 450 ? 'Hide' : 'Show'}
        id={divWidth >= 625 ? 'FeaturesListButton' : 'FeaturesListIcon'}
      >
        <Popup
          trigger={
            <Button size="mini" onClick={this.toggleFeaturesListPopup}>
              <Icon name="setting" />
              {featuresHighlighted} {divWidth >= 625 ? 'FEATURES' : ''}
            </Button>
          }
          // style={StudyPopupStyle}
          id="FeaturesListTooltip"
          basic
          on="click"
          inverted
          open={this.state.featuresListOpen}
          onClose={e => this.toggleFeaturesListPopup(e, null, true)}
          closeOnDocumentClick
          closeOnEscape
          hideOnScroll
        >
          <Popup.Content id="FeaturesListPopupContent">
            {/* <Grid>
              <Grid.Row>
                <Grid.Column
                  className="VolcanoPlotFilters"
                  id="xAxisSelector"
                  mobile={14}
                  tablet={14}
                  computer={14}
                  largeScreen={14}
                  widescreen={14}
                > */}
            {list}
            {/* </Grid.Column>
              </Grid.Row>
            </Grid> */}
          </Popup.Content>
        </Popup>
      </span>
    );
    return div;
  };

  getSVGPanesMultiFeature = () => {
    const {
      plotMultiFeatureData,
      divWidth,
      divHeight,
      pxToPtRatio,
      pointSize,
      plotMultiFeatureDataLength,
      differentialHighlightedFeaturesData,
    } = this.props;
    let panes = [];
    let dimensions = '';
    let divWidthPt = 0;
    let divHeightPt = 0;
    let divWidthPadding = 0;
    let divHeightPadding = 0;
    if (plotMultiFeatureDataLength !== 0) {
      if (divWidth && divHeight && pxToPtRatio) {
        divWidthPadding = divWidth * 0.95;
        divHeightPadding = divHeight * 0.95 - 38;
        divWidthPt = roundToPrecision(divWidthPadding / pxToPtRatio, 1);
        divHeightPt = roundToPrecision(divHeightPadding / pxToPtRatio, 1);
        const divWidthPtString = `width=${divWidthPt}`;
        const divHeightPtString = `&height=${divHeightPt}`;
        const pointSizeString = `&pointsize=${pointSize}`;
        dimensions = `?${divWidthPtString}${divHeightPtString}${pointSizeString}`;
      }
      const featuresLength = differentialHighlightedFeaturesData.length;
      const svgArray = plotMultiFeatureData.svg;
      const svgPanes = svgArray.map((s, index) => {
        const isPlotlyPlot = s.plotType.plotType.includes('plotly');
        const srcUrl = `${s.svg}${dimensions}`;
        return {
          menuItem: `${s.plotType.plotDisplay}`,
          render: () => (
            <Tab.Pane
              attached="true"
              as="div"
              key={`${index}-${s.plotType.plotDisplay}-pane-volcano`}
            >
              <div id="PlotsMultiFeatureContainer" className="svgSpan">
                {isPlotlyPlot ? (
                  <PlotlyMultiFeature
                    plotlyData={s.svg}
                    height={divHeightPadding}
                    width={divWidthPadding}
                    plotName={s.plotType.plotDisplay}
                    featuresLength={featuresLength}
                    plotlyExport={this.state.plotlyExport}
                    plotlyExportType={this.state.plotlyExportType}
                  />
                ) : (
                  <SVG
                    cacheRequests={true}
                    src={srcUrl}
                    title={`${s.plotType.plotDisplay}`}
                    uniqueHash={`b2g9e2-${index}`}
                    uniquifyIDs={true}
                  />
                )}
              </div>
            </Tab.Pane>
          ),
        };
      });
      panes = panes.concat(svgPanes);
    }
    return panes;
  };

  handleTabChangeMultiFeature = (e, { activeTabIndexPlotsMultiFeature }) => {
    if (
      activeTabIndexPlotsMultiFeature !==
      this.state.activeTabIndexPlotsMultiFeature
    ) {
      this.setState({
        activeTabIndexPlotsMultiFeature: activeTabIndexPlotsMultiFeature,
      });
    }
  };

  getInstructions = () => {
    const { differentialPlotTypes } = this.props;
    const hasPlots = differentialPlotTypes?.length > 0 || false;
    if (hasPlots) {
      return 'Select 2 or more features to display plots';
    } else {
      return 'Multi-feature plots are unavailable';
    }
  };

  handlePlotlyExport = plotlyExportType => {
    this.setState(
      {
        plotlyExport: true,
        plotlyExportType,
      },
      function() {
        // callback to reset plotly export in progress to false
        this.setState({ plotlyExport: false });
      },
    );
  };

  render() {
    const {
      plotMultiFeatureData,
      plotMultiFeatureDataLoaded,
      upperPlotsVisible,
      svgExportName,
      tab,
      divWidth,
      differentialPlotTypes,
      svgTabMax,
      modelSpecificMetaFeaturesExist,
      plotMultiFeatureDataLength,
      differentialHighlightedFeaturesData,
    } = this.props;
    const {
      activeTabIndexPlotsMultiFeature,
      pdfFlagMFPlots,
      pngFlagMFPlots,
      svgFlagMFPlots,
      txtFlagMFPlots,
      excelFlagMFPlots,
    } = this.state;
    if (upperPlotsVisible) {
      if (
        plotMultiFeatureDataLength !== 0 &&
        plotMultiFeatureData.key != null &&
        differentialHighlightedFeaturesData?.length > 1
      ) {
        let options = [];
        const svgPanesMultiFeature = this.getSVGPanesMultiFeature();
        const DropdownClass =
          differentialPlotTypes.length > svgTabMax
            ? 'Show svgPlotDropdown'
            : 'Hide svgPlotDropdown';
        const TabMenuClass =
          differentialPlotTypes.length > svgTabMax ? 'Hide' : 'Show';
        const activeTabIndexPlotsMultiFeatureVar =
          activeTabIndexPlotsMultiFeature || 0;
        const svgArray = [...plotMultiFeatureData.svg];
        options = svgArray.map(function(s, index) {
          return {
            key: `${index}=VolcanoPlotDropdownOption`,
            text: s.plotType.plotDisplay,
            value: index,
          };
        });
        const isMultifeaturePlot =
          plotMultiFeatureData?.key?.includes('features') || false;
        if (modelSpecificMetaFeaturesExist !== false && !isMultifeaturePlot) {
          const multiFeaturePlotTypes = differentialPlotTypes.filter(
            p => !p.plotType.includes('multiFeature'),
          );
          let metafeaturesDropdown = [
            {
              key: 'Feature-Data-SVG-Plot',
              text: 'Feature Data',
              value: multiFeaturePlotTypes.length,
            },
          ];
          options = [...options, ...metafeaturesDropdown];
        }
        let featuresList = null;
        featuresList = this.getFeaturesList();
        const loader = plotMultiFeatureDataLoaded ? null : (
          <Dimmer active inverted>
            <Loader size="large">Loading Multi-Feature Plots</Loader>
          </Dimmer>
        );
        return (
          <div
            className="differentialDetailSvgContainer"
            ref={this.differentialDetailPlotsMultiFeatureRef}
          >
            <div className="export-svg ShowBlock">
              <ButtonActions
                exportButtonSize={'mini'}
                excelVisible={excelFlagMFPlots}
                pdfVisible={pdfFlagMFPlots}
                pngVisible={pngFlagMFPlots}
                svgVisible={svgFlagMFPlots}
                txtVisible={txtFlagMFPlots}
                tab={tab}
                imageInfo={plotMultiFeatureData}
                tabIndex={activeTabIndexPlotsMultiFeatureVar}
                svgExportName={svgExportName}
                plot="PlotsMultiFeatureContainer"
                handlePlotlyExport={this.handlePlotlyExport}
                fwdRef={this.differentialDetailPlotsMultiFeatureRef}
              />
            </div>
            <Dropdown
              search
              selection
              compact
              options={options}
              value={
                options[activeTabIndexPlotsMultiFeatureVar]?.value ||
                options[0]?.value
              }
              onChange={this.handlePlotDropdownChangeMultiFeature}
              className={DropdownClass}
              id="svgPlotDropdownDifferential"
            />
            <Tab
              menu={{
                secondary: true,
                pointing: true,
                className: TabMenuClass,
              }}
              panes={svgPanesMultiFeature}
              onTabChange={this.handleTabChangeMultiFeature}
              activeIndex={activeTabIndexPlotsMultiFeature}
            />
            {featuresList}
            <span id={divWidth >= 625 ? 'FullScreenButton' : 'FullScreenIcon'}>
              {/* <Popup
                  trigger={ */}
              <Button
                size="mini"
                onClick={this.props.onGetMultifeaturePlotTransitionAlt}
                className={divWidth >= 625 ? '' : 'FullScreenPadding'}
              >
                <Icon
                  // name="expand"
                  name="expand arrows alternate"
                  className=""
                />
                {divWidth >= 625 ? 'FULL SCREEN' : ''}
              </Button>
            </span>
            <span id="PlotMultiFeatureDataLoader">{loader}</span>
          </div>
        );
      } else {
        let instructions = this.getInstructions();
        return (
          <div className="PlotInstructions">
            <h4 className="PlotInstructionsText NoSelect">{instructions}</h4>
          </div>
        );
      }
    } else return null;
  }
}

export default PlotsMultiFeature;
