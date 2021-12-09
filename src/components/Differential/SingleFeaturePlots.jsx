import React, { Component } from 'react';
import { Loader, Dimmer, Tab, Icon, Button, Dropdown } from 'semantic-ui-react';
import SVG from 'react-inlinesvg';
import { roundToPrecision } from '../Shared/helpers';
import ButtonActions from '../Shared/ButtonActions';
import MetafeaturesTableDynamic from './MetafeaturesTableDynamic';
import './SVGPlot.scss';

class SingleFeaturePlots extends Component {
  state = {
    activeIndexPlotTabs: 0,
    activeSVGTabIndexVolcanoSingleFeature: 0,
    excelFlagSFPlots: true,
    pngFlagSFPlots: true,
    pdfFlagSFPlots: false,
    svgFlagSFPlots: true,
    txtFlagSFPlots: false,
    isSVGReadyVolcanoSingleFeature: false,
    singleFeaturePlotContent: '',
  };
  metaFeaturesTableDynamicRef = React.createRef();
  componentDidMount() {
    const { activeSVGTabIndexVolcanoSingleFeature } = this.state;
    this.setButtonVisibility(activeSVGTabIndexVolcanoSingleFeature);
    this.getSVGPanesSingleFeature();
  }

  componentDidUpdate(prevProps, prevState) {
    const {
      imageInfoVolcanoLength,
      imageInfoVolcano,
      volcanoWidth,
      upperPlotsHeight,
      tabsMessage,
      activeIndexPlotTabs,
    } = this.props;
    const {
      activeSVGTabIndexVolcanoSingleFeature,
      isSVGReadyVolcanoSingleFeature,
    } = this.state;
    // if (
    //   prevProps.imageInfoVolcanoLength !== imageInfoVolcanoLength ||
    //   prevProps.imageInfoVolcano.key !== imageInfoVolcano.key
    // ) {
    //   if (!imageInfoVolcano?.key?.includes('features')) {
    //     this.getSVGPanesSingleFeature();
    //   }
    // }

    if (
      isSVGReadyVolcanoSingleFeature &&
      (prevProps.imageInfoVolcanoLength !== imageInfoVolcanoLength ||
        prevProps.imageInfoVolcano.key !== imageInfoVolcano.key ||
        prevProps.tabsMessage !== tabsMessage ||
        prevState.activeSVGTabIndexVolcanoSingleFeature !==
          activeSVGTabIndexVolcanoSingleFeature)
    ) {
      this.getSVGPanesSingleFeature();
      this.setButtonVisibility(activeSVGTabIndexVolcanoSingleFeature);
    }
    if (
      this.props.activeIndexPlotTabs !== 1 &&
      prevProps.activeIndexPlotTabs !== activeIndexPlotTabs
    ) {
      this.setButtonVisibility(activeIndexPlotTabs);
    }

    if (
      prevProps.volcanoWidth !== volcanoWidth ||
      prevProps.upperPlotsHeight !== upperPlotsHeight
    ) {
      this.getSVGPanesSingleFeature();
    }
  }

  setButtonVisibility = index => {
    if (this.props.differentialPlotTypes.length > 0) {
      const isMetaFeatureTab =
        this.metaFeaturesTableDynamicRef.current !== null ? true : false;
      this.setState({
        // display excel and text on meta-feature tab
        excelFlagSFPlots: isMetaFeatureTab,
        txtFlagSFPlots: isMetaFeatureTab,
        pdfFlagSFPlots: false,
        svgFlagSFPlots: !isMetaFeatureTab,
        pngFlagSFPlots: !isMetaFeatureTab,
      });
    } else {
      this.setState({
        // display just excel and text if no plot types
        excelFlagSFPlots: true,
        txtFlagSFPlots: true,
        pdfFlagSFPlots: false,
        svgFlagSFPlots: false,
        pngFlagSFPlots: false,
      });
    }
  };

  handleTabChangeSingleFeature = (e, { activeIndex }) => {
    this.setState({
      activeSVGTabIndexVolcanoSingleFeature: activeIndex,
    });
  };

  handlePlotDropdownChangeSingleFeature = (e, { value }) => {
    this.setState({
      activeSVGTabIndexVolcanoSingleFeature: value,
    });
  };

  getSVGPanesSingleFeature = () => {
    const {
      imageInfoVolcano,
      divWidth,
      divHeight,
      pxToPtRatio,
      pointSize,
      imageInfoVolcanoLength,
      modelSpecificMetaFeaturesExist,
      differentialStudy,
      differentialModel,
      isItemSVGLoaded,
    } = this.props;
    let panes = [];
    if (imageInfoVolcanoLength !== 0) {
      let dimensions = '';
      if (divWidth && divHeight && pxToPtRatio) {
        const divWidthPadding = divWidth * 0.95;
        const divHeightPadding = divHeight * 0.95 - 38;
        const divWidthPt = roundToPrecision(divWidthPadding / pxToPtRatio, 1);
        const divHeightPt = roundToPrecision(divHeightPadding / pxToPtRatio, 1);
        const divWidthPtString = `width=${divWidthPt}`;
        const divHeightPtString = `&height=${divHeightPt}`;
        const pointSizeString = `&pointsize=${pointSize}`;
        dimensions = `?${divWidthPtString}${divHeightPtString}${pointSizeString}`;
      }
      const svgArray = imageInfoVolcano.svg;
      const svgPanes = svgArray.map((s, index) => {
        const srcUrl = `${s.svg}${dimensions}`;
        return {
          menuItem: `${s.plotType.plotDisplay}`,
          render: () => (
            <Tab.Pane
              attached="true"
              as="div"
              key={`${index}-${s.plotType.plotDisplay}-pane-volcano`}
            >
              <div id="VolcanoPlotSVG" className="svgSpan">
                <SVG
                  cacheRequests={true}
                  src={srcUrl}
                  title={`${s.plotType.plotDisplay}`}
                  uniqueHash="a1f8d1"
                  uniquifyIDs={true}
                />
              </div>
            </Tab.Pane>
          ),
        };
      });
      panes = panes.concat(svgPanes);
    }
    const isMultifeaturePlot =
      imageInfoVolcano?.key?.includes('features') || false;
    if (modelSpecificMetaFeaturesExist !== false && !isMultifeaturePlot) {
      let metafeaturesTab = [
        {
          menuItem: 'Feature Data',
          render: () => (
            <Tab.Pane attached="true" as="div">
              <MetafeaturesTableDynamic
                ref={this.metaFeaturesTableDynamicRef}
                differentialStudy={differentialStudy}
                differentialModel={differentialModel}
                isItemSVGLoaded={isItemSVGLoaded}
                imageInfoVolcano={imageInfoVolcano}
                modelSpecificMetaFeaturesExist={modelSpecificMetaFeaturesExist}
              />
            </Tab.Pane>
          ),
        },
      ];
      panes = panes.concat(metafeaturesTab);
      // }
    }
    const singleFeaturePlotContent = this.getSingleFeaturePlotContent();
    this.setState({
      isSVGReadyVolcanoSingleFeature: true,
      svgPanes: panes,
      singleFeaturePlotContent,
    });
  };

  handlePlotOverlaySingleFeature = () => {
    const { imageInfoVolcano } = this.props;
    const key = imageInfoVolcano.key;
    this.props.onGetPlotTransitionRef(key, null, imageInfoVolcano, true);
  };

  getSingleFeaturePlotContent = () => {
    const {
      imageInfoVolcano,
      isVolcanoPlotSVGLoaded,
      tabsMessage,
      upperPlotsVisible,
      svgExportName,
      tab,
      divWidth,
      differentialStudy,
      differentialModel,
      differentialTest,
    } = this.props;

    const {
      activeSVGTabIndexVolcanoSingleFeature,
      isSVGReadyVolcanoSingleFeature,
      svgPanes,
      pdfFlagSFPlots,
      pngFlagSFPlots,
      svgFlagSFPlots,
      txtFlagSFPlots,
      excelFlagSFPlots,
    } = this.state;
    let options = [];
    if (upperPlotsVisible) {
      if (isSVGReadyVolcanoSingleFeature) {
        if (imageInfoVolcano.key != null && isVolcanoPlotSVGLoaded) {
          const DropdownClass =
            this.props.differentialPlotTypes.length > this.props.svgTabMax
              ? 'Show svgPlotDropdown'
              : 'Hide svgPlotDropdown';
          const TabMenuClass =
            this.props.differentialPlotTypes.length > this.props.svgTabMax
              ? 'Hide'
              : 'Show';
          // const BreadcrumbPopupStyle = {
          //   backgroundColor: '2E2E2E',
          //   borderBottom: '2px solid var(--color-primary)',
          //   color: '#FFF',
          //   padding: '1em',
          //   maxWidth: '50vw',
          //   fontSize: '13px',
          //   wordBreak: 'break-all',
          // };
          const activeSVGTabIndexVolcanoSingleFeatureVar =
            activeSVGTabIndexVolcanoSingleFeature || 0;
          const svgArray = [...imageInfoVolcano.svg];
          options = svgArray.map(function(s, index) {
            return {
              key: `${index}=VolcanoPlotDropdownOption`,
              text: s.plotType.plotDisplay,
              value: index,
            };
          });
          const isMultifeaturePlot =
            this.props.imageInfoVolcano.key?.includes('features') || false;
          if (
            this.props.modelSpecificMetaFeaturesExist !== false &&
            !isMultifeaturePlot
          ) {
            // options = options.concat(plotOptions);
            const singleFeaturePlotTypes = this.props.differentialPlotTypes.filter(
              p => !p.plotType.includes('multiFeature'),
            );
            let metafeaturesDropdown = [
              {
                key: 'Feature-Data-SVG-Plot',
                text: 'Feature Data',
                value: singleFeaturePlotTypes?.length,
              },
            ];
            options = [...options, ...metafeaturesDropdown];
          }
          return (
            <div className="svgContainerVolcano">
              <div className="export-svg ShowBlock">
                <ButtonActions
                  exportButtonSize={'mini'}
                  excelVisible={excelFlagSFPlots}
                  pdfVisible={pdfFlagSFPlots}
                  pngVisible={pngFlagSFPlots}
                  svgVisible={svgFlagSFPlots}
                  txtVisible={txtFlagSFPlots}
                  tab={tab}
                  imageInfo={imageInfoVolcano}
                  tabIndex={activeSVGTabIndexVolcanoSingleFeatureVar}
                  svgExportName={svgExportName}
                  plot="VolcanoPlotSVG"
                  refFwd={
                    this.metaFeaturesTableDynamicRef.current
                      ?.metafeaturesGridRefDynamic || null
                  }
                  study={differentialStudy}
                  model={differentialModel}
                  test={differentialTest}
                  feature={imageInfoVolcano?.key}
                />
              </div>
              <Dropdown
                search
                selection
                compact
                options={options}
                value={
                  options[activeSVGTabIndexVolcanoSingleFeatureVar]?.value ||
                  options[0]?.value
                }
                onChange={this.handlePlotDropdownChangeSingleFeature}
                className={DropdownClass}
                id={
                  isMultifeaturePlot
                    ? 'svgPlotDropdownMulti'
                    : 'svgPlotDropdownSingle'
                }
              />
              <Tab
                menu={{
                  secondary: true,
                  pointing: true,
                  className: TabMenuClass,
                }}
                panes={svgPanes}
                onTabChange={this.handleTabChange}
                activeIndex={activeSVGTabIndexVolcanoSingleFeature}
              />
              <span
                className={divWidth < 450 ? 'Hide' : 'Show'}
                id={divWidth >= 625 ? 'FullScreenButton' : 'FullScreenIcon'}
              >
                {/* <Popup
                  trigger={ */}
                <Button
                  size="mini"
                  onClick={this.handlePlotOverlaySingleFeature}
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
            </div>
          );
        } else if (!isVolcanoPlotSVGLoaded) {
          return (
            <Dimmer active inverted>
              <Loader size="large">Loading Plots</Loader>
            </Dimmer>
          );
        } else {
          return (
            <div className="PlotInstructions">
              <h4 className="PlotInstructionsText NoSelect">{tabsMessage}</h4>
            </div>
          );
        }
      } else return null;
    }
  };

  handleTabChangeSingleFeature = (
    e,
    { activeSVGTabIndexVolcanoSingleFeature },
  ) => {
    if (
      activeSVGTabIndexVolcanoSingleFeature !==
      this.state.activeSVGTabIndexVolcanoSingleFeature
    ) {
      this.setState({
        activeSVGTabIndexVolcanoSingleFeature: activeSVGTabIndexVolcanoSingleFeature,
      });
    }
  };

  render() {
    const content = this.state.singleFeaturePlotContent || '';
    return content;
  }
}

export default SingleFeaturePlots;
