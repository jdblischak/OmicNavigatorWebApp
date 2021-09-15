import React, { Component } from 'react';
import {
  Loader,
  Dimmer,
  Tab,
  Popup,
  Icon,
  // Message,
  // Menu,
  // Label,
  Button,
  Dropdown,
} from 'semantic-ui-react';
import SVG from 'react-inlinesvg';
import { roundToPrecision } from '../Shared/helpers';
// import { limitString } from '../Shared/helpers';
import ButtonActions from '../Shared/ButtonActions';
import './SVGPlot.scss';

class SVGPlot extends Component {
  state = {
    activeSVGTabIndexVolcano: 0,
  };

  componentDidMount() {
    this.getSVGPanes();
  }

  componentDidUpdate(prevProps) {
    if (
      this.state.isSVGReadyVolcano &&
      (prevProps.imageInfoVolcanoLength !== this.props.imageInfoVolcanoLength ||
        prevProps.imageInfoVolcano.key !== this.props.imageInfoVolcano.key ||
        prevProps.volcanoWidth !== this.props.volcanoWidth ||
        prevProps.volcanoHeight !== this.props.volcanoHeight)
    ) {
      this.getSVGPanes();
    }
  }

  shouldComponentUpdate(nextProps) {
    return nextProps.volcanoPlotsVisible;
  }

  handleTabChange = (e, { activeIndex }) => {
    this.setState({
      activeSVGTabIndexVolcano: activeIndex,
    });
  };

  handlePlotDropdownChange = (e, { value }) => {
    this.setState({
      activeSVGTabIndexVolcano: value,
    });
  };

  // navigateToDifferentialFeature = evt => {
  //   const testAndDescription = this.props.imageInfoVolcano.key.split(':');
  //   const test = testAndDescription[0] || '';
  //   const featureID = this.props.HighlightedProteins[0]?.featureID;
  //   this.props.onFindDifferentialFeature(test, featureID);
  // };

  getSVGPanes = () => {
    const {
      imageInfoVolcano,
      divWidth,
      divHeight,
      pxToPtRatio,
      pointSize,
      imageInfoVolcanoLength,
    } = this.props;
    if (imageInfoVolcanoLength !== 0) {
      let dimensions = '';
      if (divWidth && divHeight && pxToPtRatio) {
        const divWidthPadding = divWidth * 0.95;
        const divHeightPadding = divHeight * 0.95;
        const divWidthPt = roundToPrecision(divWidthPadding / pxToPtRatio, 1);
        const divHeightPt = roundToPrecision(divHeightPadding / pxToPtRatio, 1);
        const divWidthPtString = `width=${divWidthPt}`;
        const divHeightPtString = `&height=${divHeightPt}`;
        const pointSizeString = `&pointsize=${pointSize}`;
        dimensions = `?${divWidthPtString}${divHeightPtString}${pointSizeString}`;
      }
      const svgArray = imageInfoVolcano.svg;
      const panes = svgArray.map((s, index) => {
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
      this.setState({
        isSVGReadyVolcano: true,
        svgPanes: panes,
      });
    } else return null;
  };

  handlePlotOverlay = () => {
    const {
      HighlightedFeaturesArrVolcano,
      differentialFeatureIdKey,
      imageInfoVolcano,
    } = this.props;
    debugger;
    if (imageInfoVolcano.key.includes('features')) {
      // multifeature plot
      const featureIds = HighlightedFeaturesArrVolcano.map(
        features => features.id,
      );
      // let value = dataItem[alphanumericTrigger];
      //     let imageInfoDifferential = {
      //       key: `${value}`,
      //       title: `${alphanumericTrigger} ${value}`,
      //       svg: [],
      //     };
      //     this.props.onGetPlotTransition(
      //       dataItem[alphanumericTrigger],
      //       dataItem,
      //       imageInfoDifferential,
      //       true,
      //     );
    } else {
      // single feature plot
      const key = imageInfoVolcano.key;
      this.props.onGetPlotTransitionRef(key, null, imageInfoVolcano, true);
    }
  };

  render() {
    const {
      imageInfoVolcano,
      isVolcanoPlotSVGLoaded,
      tabsMessage,
      volcanoPlotsVisible,
      svgExportName,
      tab,
    } = this.props;

    const {
      activeSVGTabIndexVolcano,
      svgPanes,
      isSVGReadyVolcano,
    } = this.state;

    if (volcanoPlotsVisible) {
      if (isSVGReadyVolcano) {
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
          const activeSVGTabIndexVolcanoVar = activeSVGTabIndexVolcano || 0;
          const svgArray = imageInfoVolcano.svg;
          const plotOptions = svgArray.map(function(s, index) {
            return {
              key: `${index}=VolcanoPlotDropdownOption`,
              text: s.plotType.plotDisplay,
              value: index,
            };
          });
          const PopupStyle = {
            backgroundColor: '2E2E2E',
            borderBottom: '2px solid var(--color-primary)',
            color: '#FFF',
            padding: '1em',
            maxWidth: '50vw',
            fontSize: '13px',
            wordBreak: 'break-all',
          };
          return (
            <div className="svgContainerVolcano">
              <div className="export-svg ShowBlock">
                <ButtonActions
                  exportButtonSize={'mini'}
                  excelVisible={false}
                  pdfVisible={false}
                  pngVisible={true}
                  svgVisible={true}
                  txtVisible={false}
                  tab={tab}
                  imageInfo={imageInfoVolcano}
                  tabIndex={activeSVGTabIndexVolcanoVar}
                  svgExportName={svgExportName}
                  plot="VolcanoPlotSVG"
                />
              </div>
              {/* <Popup
            trigger={
              <Icon
                name="bullseye"
                size="large"
                onClick={this.navigateToDifferentialFeature}
                className="DiffTableIcon"
              />
            }
            style={BreadcrumbPopupStyle}
            inverted
            basic
            position="bottom left"
            content="view in differential analysis section"
          /> */}
              <Dropdown
                search
                selection
                compact
                options={plotOptions}
                value={plotOptions[activeSVGTabIndexVolcanoVar]?.value}
                onChange={this.handlePlotDropdownChange}
                className={DropdownClass}
                id="svgPlotDropdownDifferential"
              />
              <Tab
                menu={{
                  secondary: true,
                  pointing: true,
                  className: TabMenuClass,
                }}
                panes={svgPanes}
                onTabChange={this.handleTabChange}
                activeIndex={activeSVGTabIndexVolcano}
              />
              {this.props.tab === 'differential' ? (
                <span id="VolcanoOptionsPopup">
                  {/* <Popup
                    trigger={ */}
                  <Button size="mini" onClick={this.handlePlotOverlay}>
                    <Icon
                      // name="expand"
                      name="expand arrows alternate"
                      className=""
                    />
                    FULL SCREEN
                  </Button>
                  {/* }
                    style={PopupStyle}
                    content="View Larger"
                    basic
                  /> */}
                </span>
              ) : null}
              {/* <Icon
                name="bullseye"
                size="large"
                onClick={this.navigateToDifferentialFeature}
                className="DiffTableIcon"
              /> */}
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
      } else {
        return null;
      }
    } else return null;
  }
}

export default SVGPlot;
