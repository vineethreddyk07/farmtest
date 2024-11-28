import {
    Component,
    ElementRef,
    Input,
    OnChanges,
    OnInit,
    SimpleChanges,
    ViewChild,
    EventEmitter,
    Output,
  } from '@angular/core';
  import { BasemapService } from 'src/app/basemap/basemap.service';
  import { platformModifierKeyOnly } from 'ol/events/condition.js';
  import { CommonService } from '../../Services/common.service';
  import Overlay from 'ol/Overlay';
  import CircleStyle from 'ol/style/Circle';
  import { Circle, Fill, Stroke, Style, Icon } from 'ol/style.js';
  import Draw from 'ol/interaction/Draw.js';
  import Feature from 'ol/Feature.js';
  import Point from 'ol/geom/Point.js';
  import VectorSource from 'ol/source/Vector.js';
  import { Renderer2, RendererFactory2 } from '@angular/core';
  import OlMap from 'ol/Map';
  import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
  import { LineString } from 'ol/geom';
  import { ExcelService } from 'src/app/Services/readxlsxservice';
  import { HttpClient } from '@angular/common/http';
  import { MyService } from 'src/app/my-service.service';
  import { MatrixPathAEDSService } from './matrix-path-aeds.service';
  import { MatrixReverseAEDSService } from './matrix-reverse-aeds.service';
  import { GeobarAlertComponent } from 'src/app/geobar-alert/geobar-alert.component';
  import { SlopeAEDSService } from 'src/app/Services/slope-aeds.service';
  // import  arrow  from '../../../assets/images/arrow.png'
  import TileWMS from 'ol/source/TileWMS';
  import { AuthObservableService } from 'src/app/Services/authObservableService';
  import { NgProgress } from 'ngx-progressbar';
  
  
  @Component({
    selector: 'app-slope-finder-aeds',
    templateUrl: './slope-finder-aeds.component.html',
    styleUrls: ['./slope-finder-aeds.component.scss'],
  })
  export class SlopeFinderAEDSComponent implements OnChanges, OnInit {
    slopePercentage: number;
    @Input() angle: number;
    @Input() slopeRatio: string;
    @Input() onAEDSClicked;
    @Output() Slopevalue: EventEmitter<any> = new EventEmitter<any>();
    @Output() Angle: EventEmitter<any> = new EventEmitter<any>();
    @Output() Ratio: EventEmitter<any> = new EventEmitter<any>();
    @ViewChild(GeobarAlertComponent) alertComponent: GeobarAlertComponent;
    @Input() onLayerSelection;
    static spopupstatus: boolean;
    ratioCandidates: string;
    private basemap: OlMap;
    private renderer: Renderer2;
    raster: TileLayer;
    vector: VectorLayer;
    source: VectorSource;
    draw: any;
    snap: any;
    excelData = null;
    fileData: string;
    DEM: { [key: string]: any } = {}; // Declare DEM at the class level
    Geobon: { [key: string]: any } = {}; //
    Results: { [key: string]: string } = {}; // 
    elevationData: number[][] = [];
    markedLocationCoOrds: Array<string> = [];
    showCoOrdsCopiedMsg: boolean;
    public EntSlopeValue: any;
    static bsmapservice: any;
    static excelData: any;
    pctslope: any;
    showError: boolean = false;
    count = 0;
    exitloop = 0;
    fincompcount = 0;
    closeEnough = 0;
    pointFound = -1;
    loopcounter = 0;
    CS1: string;
    // CS1 = this.basemapService.getCurrentBasemap().getView().getProjection();
    CS4: string;
    authority: string;
    upSlopePCTtolerance = 0.005;
    dnSlopePCTtolerance = 0.05; 
    searchableSwath = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
    maxLoops = 25;
    SUI: { [key: string]: any} = {};
    upSlopeInd: number;
    SearchDir_CS4: any;
    SearchDir_CS1: any;
    unitStd_multiplier4V = 0.30480060960122;
    upSlope: number;
    GeobonZOC_Length: any;
    valuesCompiled = false;
    resultsString = '';
      arrow: any = '../../../assets/images/arrow.png';
      drawnLines = 0;
      topRightPosition: any;
      annotationCloseOptionOverlay: any;
      slopeLine: HTMLDivElement;
      slopeLineId: any;
      drawnLine: any;	
      columnsList = [];
      selectedLable = 'Z-Axis';
      layer;
      rasters:any = '';
      fileUrl;
  
  constructor(
      private http: HttpClient,
      private excelService: ExcelService,
      private commonService: CommonService,
      private basemapService: BasemapService,
      private renderer2: RendererFactory2,
      private myService: MyService,
      private matrixpath: MatrixPathAEDSService,
      private matrixreverse: MatrixReverseAEDSService,
      private el: ElementRef,
      private SlopeAEDSService: SlopeAEDSService,
      private ngProgress: NgProgress, private authObsr: AuthObservableService
  ) {
      this.renderer = this.renderer2.createRenderer(null, null);
      this.basemap = this.basemapService.getCurrentBasemap();
      this.myService.triggerKeyupEnter$.subscribe((data) => {
          console.log('what is data here ', data)
      });
  }
  baseService: BasemapService;
    
  ngOnInit(): void {
      this.commonService.onAEDSLayerMenuClicked.subscribe((layer) => {
          console.log('Farming slopAED layer meny changed ', layer);
          this.displayColumnDropdown(layer);
      })
      // this.fileUrl = 'https://firebasestorage.googleapis.com/v0/b/geomocus-qa.appspot.com/o/static_data%2Fvermontch_utm18n.frf?alt=media&token=887f80d3-808f-4cb8-ba3d-6c3d8fff4fc3';
      // const fileUrl = 'https://firebasestorage.googleapis.com/v0/b/geomocus-qa.appspot.com/o/output.frf?alt=media&token=43f59e39-f4d0-4fa6-975f-ed743ac3a81b&_gl=1*1nhwrn*_ga*MjY1OTUyMTExLjE2NDE1MjMwNDA.*_ga_CW55HF8NVT*MTY5NzEwNDUxMy40Mi4xLjE2OTcxMDQ1MjMuNTAuMC4w';
      console.log( "MSG: FILE URL", this.fileUrl);
      this.fetchingFirebaseURLData();
      
  }
  updateParameters() {
      // Parse `searchableSwath` from a comma-separated string to a number array
      this.searchableSwath = this.searchableSwath
        .toString()
        .split(',')
        .map((value) => parseFloat(value.trim()))
        .filter((value) => !isNaN(value));
    
      console.log('MSG :Updated Parameters Upslope Tolerance:', this.upSlopePCTtolerance);
      console.log('MSG :Updated Parameters Downslope Tolerance:', this.dnSlopePCTtolerance);
      console.log('MSG :Updated Parameters Searchable Swath:', this.searchableSwath);
      console.log('MSG :Updated Parameters Max Loops:', this.maxLoops);
    }
    
  
  fetchingFirebaseURLData() {
      this.fileUrl = 'https://firebasestorage.googleapis.com/v0/b/geomocus-qa.appspot.com/o/static_data%2Fvermontch_utm18n.frf?alt=media&token=887f80d3-808f-4cb8-ba3d-6c3d8fff4fc3'
      this.SlopeAEDSService.getTextFileData(this.fileUrl).subscribe(
          data => {
              console.log( "MSG: FILE URL IN fetchingFirebaseURLData ", this.fileUrl);
              if (!data) {
              // Fetching from cache
              this.SlopeAEDSService.getFileDataCache().subscribe(cachedData => {
              this.fileData = cachedData;
              });
          } else {
              // Fetching from URL and caching
              this.fileData = data;
              this.SlopeAEDSService.cacheFileData(data);
              //console.log(data, "checkfrfdata")
              // Parse header and elevation data
              this.parseData(data);
          }
          // Now you can work with this.fileData
          },
          error => {console.error('Error fetching file data:', error);}
      );
  }
    
  private parseData(data: string): void {
      // The parsing code from my previous response
      // Extract DEM and elevationData from the parsed result
      // Parse the text data
      const lines = this.fileData.trim().split('\n');
      let isHeader = false;
      let DEM: { [key: string]: string } = {};
      let elevationData: number[][] = [];
      for (const line of lines) {
          if (line.includes('HEADERBEGIN')) {
              isHeader = true;
              continue;
          } else if (line.includes('HEADEREND')) {
              isHeader = false;
              continue;
          } else if (line.includes('DATABEGIN')) {
              isHeader = false;
              continue;
          }
          if (isHeader) {
              const [key, value] = line.split('\t');
              DEM[key] = value;
          } else if (!isHeader && line.trim() !== '') {
              const elevationRow = line.split(' ').map(Number);
              elevationData.push(elevationRow);
          }
      }
      // Extracted variables
      this.DEM.hrefsys = DEM.hrefsys;
      this.DEM.vrefsys = DEM.vrefsys;
      this.DEM.authority = DEM.authority;
      this.DEM.Resolution = DEM.cellsize;
      this.DEM.LLC_ASCIIx = DEM.llcx;
      this.DEM.LLC_ASCIIy  = DEM.llcy;
      this.DEM.RCOUNT_ASCII = DEM.rows;
      this.DEM.CCOUNT_ASCII  = DEM.cols;
      this.DEM.CS4 = `${this.DEM.authority.trim()}:${this.DEM.hrefsys.trim()}`;
      this.DEM.CS1 = this.basemapService.getCurrentBasemap().getView().getProjection();
      this.DEM.hunits = DEM.hunits;
      this.DEM.vunits = DEM.vunits;
      this.resultsString += `DEM: ${this.DEM}\n`;
      // Save parsed elevation data into array called elevationData
      this.elevationData = elevationData;
      console.log("MSG: DEM VALUES CS4 AND CS1", this.DEM.CS4, this.DEM.CS1)
  
      //below are derived variables, not direct inputs from FRF 
      
      //unitStd_multiplier4V = multiplication factor for Vertical to standardize units across
       if((DEM.hunits.trim() === 'meters')  && (DEM.vunits.trim() === 'feet')){
           this.unitStd_multiplier4V = 0.30480060960122;
          //console.log("MSG: In parseData, CONDITION met, this.unitStd_multiplier4V", this.unitStd_multiplier4V)
      }
      if((DEM.hunits.trim() === 'meters')  && (DEM.vunits.trim() === '')){
          this.unitStd_multiplier4V = 0.30480060960122;
         //console.log("MSG: In parseData, CONDITION met, this.unitStd_multiplier4V", this.unitStd_multiplier4V)
      }
      if(this.DEM.hunits.trim() === 'feet' && this.DEM.vunits.trim() === 'meters'){
           this.unitStd_multiplier4V = 1/0.30480060960122;
       }
       if(this.DEM.hunits.trim() === this.DEM.vunits.trim()){
           this.unitStd_multiplier4V = 1;
       }
        
      console.log("MSG: HUNITS, VUNITS, Conversion Factor ", this.DEM.hunits, this.DEM.vunits, this.unitStd_multiplier4V)
  
      this.DEM.TRC_ASCIIx = (parseFloat(this.DEM.LLC_ASCIIx) + (parseFloat(this.DEM.CCOUNT_ASCII) + 1) * parseFloat(this.DEM.Resolution)).toString();
      this.DEM.TRC_ASCIIy = (parseFloat(this.DEM.LLC_ASCIIy) + (parseFloat(this.DEM.RCOUNT_ASCII) + 1) * parseFloat(this.DEM.Resolution)).toString();
      
      //Transform LLC_ASCII from User Provided System (CS3) into CS4 and store result as LLC_CS4. Currently CS3 is suspended.
      //  this.DEM.LLC_CS4 = this.basemapService.getTransformedCoordinates([this.DEM.LLC_ASCIIx, this.DEM.LLC_ASCIIy],this.DEM.CS4, this.DEM.CS4); 
      this.DEM.LLC_CS4x = this.DEM.LLC_ASCIIx;
      this.DEM.LLC_CS4y = this.DEM.LLC_ASCIIy;
       
      //Transform TRC_ASCII into CS4 and store result as TRC_CS4
      //  this.DEM.TRC_CS4 = this.basemapService.getTransformedCoordinates([this.DEM.TRC_ASCIIx, this.DEM.TRC_ASCIIy],this.DEM.CS4,this.DEM.CS4);
      this.DEM.TRC_CS4x = this.DEM.TRC_ASCIIx;
      this.DEM.TRC_CS4y = this.DEM.TRC_ASCIIy;
  
      //this can be a gross approximation, need to fix this in the future based on what coordinate system CS4 would be.
      this.DEM.Res_CS4 = ((parseFloat(this.DEM.TRC_CS4y) - parseFloat(this.DEM.LLC_CS4y)) /parseFloat(this.DEM.RCOUNT_ASCII + 1));
      
  
      this.printArray2Console("Geometry of LLC Initially! ",[this.DEM.LLC_CS4x, this.DEM.LLC_CS4y]);
      this.printArray2Console("Geometry of TRC Initially! ",[this.DEM.TRC_CS4x, this.DEM.TRC_CS4y]);
      this.printArray2Console("Resolution of DEM!", [this.DEM.Res_CS4]);
      
      //VINEET: Please put checks on every variable and after every variable is read in accurately, set a "go-AEDS" to 1. else make it 0.
  }
  
  //This routine captures changes in user information like from the parameter bar.
  ngOnChanges(changes: SimpleChanges) {
      if(this.onAEDSClicked){
          console.log("MSG: onslope and onAEDSClicked ",this.onAEDSClicked)
          this.captureSlopeDir();
      }
      if(!this.onAEDSClicked){
          console.log("MSG: onslope and onAEDSClickedd ",!this.onAEDSClicked)
          this.removeDrawInteraction(); // Remove the draw interaction
      }
      if (changes.slopePercentage && !changes.slopePercentage.firstChange) {
          this.calculateAngleAndRatioFromSlope();
      }
      if (changes.angle && !changes.angle.firstChange) {
          this.calculateSlopeAndRatioFromAngle();
      }
      if (changes.slopeRatio && !changes.slopeRatio.firstChange) {
          this.calculateSlopeAndAngleFromRatio();
      }
    }
    
  calculateAngleAndRatioFromSlope() {
      const slopeDecimal = this.slopePercentage;
      this.EntSlopeValue = slopeDecimal;
      this.Slopevalue.emit(this.slopePercentage);
      this.angle = (Math.atan(slopeDecimal) * 180) / Math.PI;
      this.angle = Number(this.angle.toFixed(2)); // round to 2 digits after decimal
      if (
          Number.isInteger(slopeDecimal) &&
          slopeDecimal >= 0 &&
          slopeDecimal <= 100
      ) {
          // Compute getRatio
          const slopeRatio = this.getRatio(slopeDecimal);
          const gcd = this.getGcd(slopeDecimal, 100);
          this.slopeRatio = `${slopeDecimal / gcd}:${100 / gcd}`;
      } else if (slopeDecimal >= 0 && slopeDecimal <= 100) {
          // Handle decimals
          this.slopeRatio = this.calculateRatioFromSlopePercentage(slopeDecimal);
      } else {
          // Handle input outside the range [0, 100]
          const slopeRatio = this.getRatio(slopeDecimal);
          const gcd = this.getGcd(slopeDecimal, 100);
          this.slopeRatio = `${slopeDecimal / gcd}:${100 / gcd}`;
      }
  }
  
  calculateSlopeAndRatioFromAngle() {
      const angleRad = (this.angle * Math.PI) / 180;
      const slope = Math.tan(angleRad) * 100;
      const slopeDecimal = slope / 100;
      this.slopePercentage = Number(slopeDecimal.toFixed(2)); // round to 2 digits after decimal
      this.Slopevalue.emit(this.slopePercentage);
      if (
          Number.isInteger(this.slopePercentage) &&
          this.slopePercentage >= 0 &&
          this.slopePercentage <= 100
      ) {
          // Compute getRatio
          const slopeRatio = this.getRatio(this.slopePercentage);
          const gcd = this.getGcd(this.slopePercentage, 100);
          this.slopeRatio = `${this.slopePercentage / gcd}:${100 / gcd}`;
      } else if (this.slopePercentage >= 0 && this.slopePercentage <= 100) {
          // Handle decimals
          this.slopeRatio = this.calculateRatioFromSlopePercentage(
            this.slopePercentage
          );
      } else {
          // Handle input outside the range [0, 100]
          const slopeRatio = this.getRatio(this.slopePercentage);
          const gcd = this.getGcd(this.slopePercentage, 100);
          this.slopeRatio = `${this.slopePercentage / gcd}:${100 / gcd}`;
      }
  }
    
  calculateSlopeAndAngleFromRatio() {
      const ratioArr = this.slopeRatio.split(':');
      const ratioDecimal = Number(ratioArr[0]) / Number(ratioArr[1]);
      const slope = ratioDecimal * 100;
      const angle = (Math.atan(slope) * 180) / Math.PI;
      this.slopePercentage = slope;
      this.slopePercentage = Number(slope.toFixed(2)); // round to 2 digits after decimal
      this.Slopevalue.emit(this.slopePercentage);
      this.angle = angle;
      this.angle = Number(this.angle.toFixed(2)); // round to 2 digits after decimal
      const gcd = this.getGcd(slope, 100);
  }
  
  getRatio(n: number): [number, number] {
      const tolerance = 1.0e-6;
      let h1 = 1,
          h2 = 0,
          k1 = 0,
          k2 = 1;
      let b = n;
      do {
          let a = Math.floor(b);
          let aux = h1;
          h1 = a * h1 + h2;
          h2 = aux;
          aux = k1;
          k1 = a * k1 + k2;
          k2 = aux;
          b = 1 / (b - a);
      } while (Math.abs(n - h1 / k1) > n * tolerance);
  
      // Simplify the ratio
      const gcd = this.getGcd(h1, k1);
      const h = h1 / gcd;
      const k = k1 / gcd;
  
      return [h, k];
  }
  
  getGcd(a: number, b: number): number {
      if (b === 0) {
          return a;
      } else {
          return this.getGcd(b, a % b);
      }
  }
  
  calculateRatioFromSlopePercentage(slopePercentage) {
      // Initialize an array to store the ratio candidates
      const ratioCandidates = [];
  
      // Iterate over the numbers 1 to 100 (or any other max number you choose)
      for (let i = 1; i <= 100; i++) {
          // Calculate the slope ratio for the current number
          const slopeRatioo = +(slopePercentage * i).toFixed(2);
          const ratio = Math.floor(slopeRatioo) + ':' + i;
          
          // Calculate the difference between the slope ratio and the result
          const diff = Math.abs(slopeRatioo - Math.floor(slopeRatioo)).toFixed(2);
  
          // Add the ratio and difference to the candidates array
          ratioCandidates.push({ ratio, diff });
      }
  
      // Sort the candidates array by the difference in ascending order
      ratioCandidates.sort((a, b) => a.diff - b.diff);
  
      // Return the ratio with the smallest difference
      return ratioCandidates[0].ratio;
  }
    
  captureSlopeDir() {
      //Create a new vector layer for the line and vertices
  
      const styleArray = []
  
      const initialStyle = new Style({
          stroke: new Stroke({
              color: '#0000FF',
              width: 2,
              opacity: 0.5
          }),
          image: new Circle({
              radius: 4,
              fill: new Fill({
                  color: 'red',
              }),
              stroke: new Stroke({
                  color: 'blue',
                  width: 2,
                  opacity: 0.5
              }),
          }),
      });
      
      // Push the initial style into the style array
      styleArray.push(initialStyle);
  
      const vectorLayer = new VectorLayer({
          source: new VectorSource(),
          style: styleArray,
          name: 'slopeLayer'
      });
      
      // Add the vector layer to the map
      if (!this.commonService.isValid(this.basemap)) {
          this.basemap = this.basemapService.getCurrentBasemap();
      }
      this.basemap.addLayer(vectorLayer);
      vectorLayer.setZIndex(3);
  
      // Create the interaction to draw the line
      this.drawnLine = new Draw({
          source: vectorLayer.getSource(),
          type: 'LineString',
      });
  
      // Add the draw interaction to the map
      this.basemap.addInteraction(this.drawnLine);
  
      // Create an array to store the coordinates of the drawn line
  
      this.drawnLine.on('drawend', async (event) => {
          this.SearchDir_CS1 = event.feature.getGeometry().getCoordinates();
          this.drawnLines++
          // 	this.slopeLine = document.createElement('div')
          // this.slopeLine.setAttribute('id', `${this.drawnLines}_slope`)
          this.drawnLine.set('interactionId',`${this.drawnLines}_slope` )
  
          // checking the directions of the line
          const dx= this.SearchDir_CS1[1][0] - this.SearchDir_CS1[0][0];
          const dy = this.SearchDir_CS1[1][1] - this.SearchDir_CS1[0][1];
          const rotation = Math.atan2(dy, dx);
  
          //assigning the arrow to the drawn line
          const newStyle = new Style({
              geometry: new Point(this.SearchDir_CS1[1]),
              image: new Icon({
                  src: this.arrow,
                  anchor: [0.75, 0.5],
                  rotateWithView: true,
                  rotation: -rotation,
              }),
          });
          styleArray.push(newStyle);
          // event.feature.on('click', (evt) => {
          // 	if (evt.originalEvent.ctrlKey) {}
          // })
  
          this.printArray2Console("Geometry captured from screen in CS1!", this.SearchDir_CS1);
          this.loopcounter = 0;
      
          // debugger
          this.SUIvaluesinCS4();
  
          //this is the start of the slope finding algorithm.
          if (this.upSlopeInd ===1) {
              console.log("MSG: User chose an upslope direction, not running the tool for upslope delineation");
          } else {
              this.slopefindertool();
          }
          this.slopeLineId = `${this.drawnLines}_slope`
          vectorLayer.id = this.slopeLineId
          this.cancelSlopeElement()
      });
      console.log(this.slopeLineId, 'slopelineid')
  
      vectorLayer.setOpacity(0.35)
  
  }
  
  removeDrawInteraction() {
      if (this.drawnLine && this.basemap) {
        this.basemap.removeInteraction(this.drawnLine);
        this.drawnLine = null;
      }
  }
  cancelSlopeElement(){
  
      this.basemap.on('click' , (event) => {
          const isCtrl = platformModifierKeyOnly(event)
           if(isCtrl){
              this.topRightPosition = this.SearchDir_CS1[0];
              const annotationCloseOptionOverlay: Overlay = new Overlay({id: `${this.slopeLineId}_delete` });
              console.log(annotationCloseOptionOverlay, 'overlayelement')
              annotationCloseOptionOverlay.setPosition(this.topRightPosition);
              const allLayers = this.basemap.getLayers();
              console.log(allLayers, "vectorlayers")
              const cancelButton = document.createElement('div');
              cancelButton.setAttribute('title', 'Cancel');
              cancelButton.style.padding = '0 5px';
              cancelButton.style.margin = '2px';
              cancelButton.style.cursor = 'pointer';
              
              const cancelImg = document.createElement('img');
              cancelImg.style.width = '12px';
              cancelImg.src = 'assets/svgs/geopad/close-icon2.svg';
              
              cancelButton.appendChild(cancelImg);
              
              annotationCloseOptionOverlay.setElement(cancelButton);
              this.basemap.addOverlay(annotationCloseOptionOverlay);
              const interactions = this.basemap.getInteractions();
  
              cancelButton.addEventListener('click' , (e) => {
  
                  // interactions.forEach(interaction  => {
                  // 	if(interaction instanceof Draw){
                  // 	if(interaction.values_.interactionId == slopeId ){
                  // 		this.basemap.removeInteraction(interaction)
                  // 	}
                  // }
                  // })
                  allLayers.forEach(slopeLayer => {
                      if(slopeLayer.values_.name == 'slopeLayer'){
                          if(`${slopeLayer.id}_delete` == annotationCloseOptionOverlay.id ){
                              this.basemap.removeLayer(slopeLayer)
                          }
                      }
                  })
  
              } )
          }
      })
  
      
  
  }
  printArray2Console(indic, Ary) {
      let lAry = Ary;
      console.log("DEBUG-MSG", indic, " ", lAry);
      //lAry.forEach((value) => {
      //	console.log("PRINT-ARRAY", indic, " ", value);
      // });
  }
  
  SUIvaluesinCS4() {
      //computer all Initial User Line vertices and parameters in CS4
              
      if (this.loopcounter === 0) {
          console.log("MSG: Entered into SUIvaluesinCS4 function loopcounter", this.loopcounter);
          //Transform User Line vertices into CS4
          const IP_CS4 = this.basemapService.getTransformedCoordinates([this.SearchDir_CS1[0][0], this.SearchDir_CS1[0][1]], this.DEM.CS1, this.DEM.CS4); 
          const FP_CS4 = this.basemapService.getTransformedCoordinates([this.SearchDir_CS1[1][0], this.SearchDir_CS1[1][1]], this.DEM.CS1, this.DEM.CS4); 
          this.SearchDir_CS4 =  [ [IP_CS4[0],IP_CS4[1]],[FP_CS4[0],FP_CS4[1]] ];
  
          this.printArray2Console("Geometry transformed to CS4 STEP2", this.SearchDir_CS4);
      }
      
      this.SUI.DEM_I_col = Math.floor((this.SearchDir_CS4[0][0] - this.DEM.LLC_CS4x) / (this.DEM.Res_CS4));
      this.SUI.DEM_I_row = this.DEM.RCOUNT_ASCII - Math.floor((this.SearchDir_CS4[0][1] - this.DEM.LLC_CS4y) / (this.DEM.Res_CS4));
      this.SUI.DEM_F_col = Math.floor((this.SearchDir_CS4[1][0] - this.DEM.LLC_CS4x) / (this.DEM.Res_CS4));
      this.SUI.DEM_F_row = this.DEM.RCOUNT_ASCII - Math.floor((this.SearchDir_CS4[1][1] - this.DEM.LLC_CS4y) / (this.DEM.Res_CS4));
      this.SUI.ILV_DEM = [[this.SUI.DEM_I_col,this.SUI.DEM_I_row],[this.SUI.DEM_F_col,this.SUI.DEM_F_row]];
      this.SUI.IElev = this.elevationData[this.SUI.DEM_I_row - 1][this.SUI.DEM_I_col - 1];
      this.SUI.FElev = this.elevationData[this.SUI.DEM_F_row - 1][this.SUI.DEM_F_col - 1];
      this.upSlopeInd = this.checkInclineDir(this.SUI.DEM_I_col,this.SUI.DEM_I_row,this.SUI.DEM_F_col,this.SUI.DEM_F_row,this.SUI.IElev,this.SUI.FElev,this.upSlopePCTtolerance)
      
      //this.printArray2Console("Geometry of LLC in SUIValues! ",[this.DEM.LLC_CS4x, this.DEM.LLC_CS4y]);
  
      this.resultsString +=
          `User Line Vertices Lat, Long: ${this.SearchDir_CS1}\n`+
          `User Line Vertices Eastings, Northings: ${this.SearchDir_CS4}\n`+
          `User Line Vertices DEM Rows, Cols: ${this.SUI.ILV_DEM}\n`+
          `User Line Vertices elevation values, initial:  ${this.SUI.IElev}+ final: ${this.SUI.FElev}\n`+
          `User Line Vertices Rows, Cols: ${this.SUI.ILV_DEM}\n`+
          `User Line slope: ${this.SUI.ILV_Slope}\n`+
          `User Line length: ${this.SUI.ILV_Distance}\n`+
          `Upslope Indicator Check: ${this.upSlopeInd}\n`+
          `Percent Slope Tolerance used for upslope determination: ${this.upSlopePCTtolerance}\n`;
      console.log("MSG: Leaving SUIvaluesinCS4, done computing ILV parameters needed for the run")
  }
  
  checkInclineDir(Icol,Irow,Fcol,Frow,Ielev,Felev,tol) {
      console.log("MSG: Entered checkInclineDir, checking slope incline direction")
      this.SUI.ILV_Distance = (Math.sqrt(Math.pow(Frow-Irow, 2) + Math.pow(Fcol-Icol, 2)) * parseFloat(this.DEM.Res_CS4));
      this.SUI.ILV_Slope = ((Felev-Ielev)* this.unitStd_multiplier4V)/this.SUI.ILV_Distance;
      //console.log("MSG: Leaving checkInclineDir, finished checking slope incline direction")
      console.log("loop, upslope", Felev, Ielev, this.loopcounter, this.SUI.ILV_Slope);
      if (this.SUI.ILV_Slope > tol) return 1;
  
      if (this.SUI.ILV_Slope <= tol) return 0;
  }
  
  slopefindertool() {
      console.log("MSG: Entered slopefindertool, starting delineating the downward slope path")
      let stopTheRun = 0;//0 if search is still on, 1 if search is closed
      this.resetSearchChecks();
      this.printArray2Console("Geometry of Line Segment before WHILE",[this.SearchDir_CS4]);
      while (stopTheRun < 1) {
          console.log("loop", this.loopcounter);
          
          this.geobonParams(this.SearchDir_CS4);			
          let t = 0;
          while (this.pointFound <= -1) {
              if (t < this.searchableSwath.length) {
                  //console.log("MSG: In slopefindertool, starting to build GeobonZOC, DEMZOC and other parameters")
                  this.buildGeobonZOC(this.Geobon.CANDFr_LTOP, this.Geobon.CANDFc_LTOP, this.searchableSwath[t]);
              } else {
                  stopTheRun = 1;
                  console.log("MSG: In slopefindertool, desired downward slope not found along this direction, please select a different value for slope or chose another direction @ thresolhd,", this.searchableSwath[t]);
                  break;
              }
              if (this.GeobonZOC_Length > 0) {
                  this.buildDEMZOC(this.SUI.DEM_I_row,this.SUI.DEM_I_col,this.SUI.DEM_F_row,this.SUI.DEM_F_col,this.GeobonZOC_Length);
              } else {
                  stopTheRun = 1;
                  console.log("MSG: In slopefindertool,GeobonZOC_Length is Null or 0, DEMZOC and other parameters won't be built. Quitting!@ thresolhd,", this.searchableSwath[t]);
                  break;
              }
              console.log("MSG: IN slopefindertool, just passed the GZL check", this.GeobonZOC_Length);
              if (this.Geobon.DEM_ZOC_Indexes.length > 0) {
                  this.pointFound = this.findPoint();
                  if (this.pointFound >= 0) {
                      stopTheRun = 1;
                      console.log("MSG: In Slopefinder, this.pointFound @ thresolhd,", this.Geobon.FINAL_SLOPE[this.pointFound],this.searchableSwath[t], this.pointFound);
                      break;
                  } else {
                      console.log("MSG: In slopefindertool, downward slope point not found @ ", this.pointFound, this.searchableSwath[t],"! increasing the swath for further search");
                      t++;
                  }
              } else {
                  stopTheRun = 1;
                  console.log("MSG: In slopefindertool, DEMZOC_Length is Null or 0, downward slope cannot be delineated.  Quitting!")
                  break;
              }
          }
          //this.printArray2Console("Checking GeobonZoc Geometry", this.Geobon.GeobonZOC);
          //this.printArray2Console("Checking DEMZOC Geometry", this.Geobon.DEM_ZOC_Indexes);
          //this.printArray2Console("Checking Search Direction Geometry WHILE", this.SearchDir_CS4);
          if(this.pointFound === -1) {
              //console.log("MSG: In slopefindertool, downward slope point not found, reached maximum swath, not searching further!");
              stopTheRun = 1;
              break;
          } else {
              //console.log("MSG: In slopefindertool, found the downward slope point! and the index in DemZOC is ", this.pointFound, "@ loopcounter", this.loopcounter);
              //this.printArray2Console("Geometry of DEMZOC STEP3",this.Geobon.DEM_ZOC_Indexes);
              this.closeEnough = this.drawnNdistCheck(this.pointFound);
          }
  
          if (this.closeEnough === 1) {
              stopTheRun = 1;
              //console.log("MSG: Leaving slopefindertool, finished finding the next", this.loopcounter, "th downward slope point finding");
              break;
          } else {
              this.SUIvaluesinCS4();
              //this is the repeat of the slope finding algorithm.
              if (this.upSlopeInd ===1) {
                  console.log("MSG: Hit upslope, quitting the search. Please choose a new direction to search");
                  stopTheRun = 1;
                  break;
              } else {
                  stopTheRun = 0;
                  this.resetSearchChecks();
                  console.log("MSG: In slopefindertool, looping again (", this.loopcounter , "UPLOPE", this.upSlopeInd, "CLOSE ENOUGH?", this.closeEnough, "), finished resetting all checks and variables again!")
              }
          }
          const tempr = this.loopcounter;
          console.log("ENOUGH ", tempr);
          this.loopcounter++;
          if (this.loopcounter > this.maxLoops) {
              console.log("MSG: Hit maxmimum loops, quitting the search. Please choose a new direction to search");
              stopTheRun = 1;
              break;
          }
      }
      
  }
  
  
  resetSearchChecks() {
      this.pointFound = -1;//-1 for suitable point for desired slope not found yet; 0 or more (slope array index) for suitable point for desired slope found, quit!
      //this.loopcounter = 0;//count for while loops
      this.upSlopeInd = 0; //0 for downslope, 1 for upslope
      this.closeEnough = 0; //1 if AEDS finish point distance is close enough (in the same 'DEM-cell' as the user final point). 0 if there is more AEDS work to do. 
  }
       
  geobonParams(LSV) {
      console.log("MSG: Entered geobonParams, computing geobon parameters for the current line segment")
      this.Geobon.GeoPS = 5;
      this.Geobon.candist4 = Math.sqrt(Math.pow(LSV[0][0] - LSV[0][1], 2) + Math.pow(LSV[1][0] - LSV[1][1], 2));
      this.Geobon.GeobonRes = this.Geobon.candist4 / this.Geobon.GeoPS;
      this.Geobon.CANDIr_LTOP = 0;
      this.Geobon.CANDIc_LTOP = 0;
      this.Geobon.CANDFc_LTOP = Math.floor((LSV[0][0] - LSV[0][1]) / this.Geobon.GeobonRes);
      this.Geobon.CANDFr_LTOP = Math.floor((LSV[1][0] - LSV[1][1]) / this.Geobon.GeobonRes);
      console.log("MSG: Leaving geobonParams, finished computing geobon parameters")
  }
      
  buildGeobonZOC(CANDFr_LTOP, CANDFc_LTOP, thresh) {
      console.log("MSG: Entered buildGeobonZOC, developing the GeobonZOC parameters")
      const path = this.matrixpath.path;
      this.Geobon.GeobonZOC = [];
      for (const [pathRow, pathCol] of path) {
          var D2D = Math.sqrt(Math.pow(CANDFr_LTOP - pathRow, 2) + Math.pow(CANDFc_LTOP - pathCol, 2));
          const D2O = Math.sqrt(Math.pow(pathRow, 2) + Math.pow(pathCol, 2));
          var InitialDist = Math.sqrt(Math.pow(CANDFr_LTOP, 2) + Math.pow(CANDFc_LTOP, 2));
          var TotalDist = D2D + D2O;
          var diff = TotalDist - InitialDist;
          if (diff < thresh) {
              this.Geobon.GeobonZOC.push([pathRow, pathCol]);
          }
      }
      this.GeobonZOC_Length = this.Geobon.GeobonZOC.length;
      console.log("MSG: Leaving buildGeobonZOC, finished developing the GeobonZOC parameters")
  }
  
  buildDEMZOC(Irow,Icol,Frow,Fcol,GZL) {
  
      console.log("MSG: Entered buildDEMZOC, building DEMZOC for the GeobonZOC with ",GZL, "elements");
          
      this.Geobon.DEM_ZOC_Indexes =[];
      this.Geobon.DEM_ZOC_Eelevations = [];
      this.Geobon.DEM_ZOC_ElevDiffs = [];
      this.Geobon.DEM_ZOC_CandDistances = [];
  
      let tIrow = Irow < Frow ? Irow : Frow;  
      let tIcol = Icol < Fcol ? Icol : Fcol;
      let tFrow = Frow > Irow ? Frow : Irow;
      let tFcol = Fcol > Icol ? Fcol : Icol;
      
      console.log("MSG: In buildDEMZOC, running loop to building DEMZOC between rows ", tIrow, " to ", tFrow, " and columns ", tIcol, " to ", tFcol);
      console.log("DEM Res CS4", this.DEM.Res_CS4);
  
      for (let i = tIrow+1; i <= tFrow; i++) {
          for (let j = tIcol+1; j <= tFcol; j++) {
              // console.log("MSG: In buildDEMZOC, running loop i =", i, "j=", j);
              // Compute current x and y values
              const currCS4x = parseFloat(this.DEM.LLC_CS4x) + j * parseFloat(this.DEM.Res_CS4);
              const currCS4y = parseFloat(this.DEM.LLC_CS4y) + i * parseFloat(this.DEM.Res_CS4);
              
              // Compute GeobonZOC indexes for current x and y values
              const GeobonZOC_CurrCol = Math.floor((currCS4x - this.SearchDir_CS4[0][0]) / this.Geobon.GeobonRes);
              const GeobonZOC_CurrRow = Math.floor((currCS4y - this.SearchDir_CS4[0][1]) / this.Geobon.GeobonRes);
      
              // Loop through GeobonZOC 2D array
              // console.log("MSG: In buildDEMZOC, running loop i =", i, "j=", j, "starting the check against ", GZL, "indexes in GeobonZOC");
              for (let k = 0; k < GZL; k++) {
                  //console.log("MSG: In buildDEMZOC, running loop i =", i, "j=", j, "and checking against the ", k, "th index in GeobonZOC");
                  const geobonZOC_Row = this.Geobon.GeobonZOC[k][0];
                  const geobonZOC_Col = this.Geobon.GeobonZOC[k][1];
                  //console.log("MSG: In buildDEMZOC, checking i, j, k",i,j,k);
                  // Check if current coordinates match any pair in GeobonZOC
                  if (GeobonZOC_CurrRow == geobonZOC_Row && GeobonZOC_CurrCol == geobonZOC_Col) {
                      //console.log("MSG: In buildDEMZOC, found matching row and column of DEM " , i, j, "against the GeobonZOC index", k);
                      this.Geobon.DEM_ZOC_Indexes.push([i, j]);
                      this.Geobon.DEM_ZOC_Eelevations.push(this.elevationData[i - 1][j - 1]);
                      this.Geobon.DEM_ZOC_ElevDiffs.push(Math.abs(this.elevationData[i - 1][j - 1] - (this.SUI.IElev)) * this.unitStd_multiplier4V);
                      this.Geobon.DEM_ZOC_CandDistances.push(Math.sqrt(Math.pow(i - Irow, 2) + Math.pow(j - Icol, 2)) * parseFloat(this.DEM.Res_CS4));
                  } 
              }
          }
      }
      
  }
      
  findPointOLD() {
      this.Geobon.FINAL_SLOPE = this.Geobon.DEM_ZOC_ElevDiffs.map((element, index) => element / this.Geobon.DEM_ZOC_CandDistances[index]);
      //this.Geobon.PICK_CLOSEST = this.Geobon.FINAL_SLOPE.map((element, index) => (element - this.slopePercentage)*this.Geobon.DEM_ZOC_CandDistances[index]);
      //console.log("MSG: Printing closest", this.Geobon.PICK_CLOSEST)
       for (let index = 0; index < this.Geobon.FINAL_SLOPE.length; index++) {
          if (Number.isNaN(this.Geobon.FINAL_SLOPE[index])) {
              //console.log("MSG: pointFound, In findPoint, Index and PCT Error", this.Geobon.FINAL_SLOPE[index] , index);
              //return -1;
          } else {
              const PCT_Error = (Math.abs(this.Geobon.FINAL_SLOPE[index] - this.slopePercentage)) / this.slopePercentage;;
              //console.log("MSG: In findPoint, Slope", this.Geobon.FINAL_SLOPE[index], "user Slope", this.slopePercentage, "PCT Error", PCT_Error);
              if (PCT_Error <= this.dnSlopePCTtolerance) {
                  //console.log("MSG: pointFound, In findPoint, Index and PCT Error", PCT_Error, index);
                  return index;
              } 
          }
      }
      //console.log("MSG: In findPoint, Index", -1);
      return -1;
  }
  
  findPoint() {
      
      this.Geobon.FINAL_SLOPE = this.Geobon.DEM_ZOC_ElevDiffs.map((element, index) => element / this.Geobon.DEM_ZOC_CandDistances[index]);
      let minDis = Infinity;
  
       for (let index = 0; index < this.Geobon.FINAL_SLOPE.length; index++) {
          if (Number.isNaN(this.Geobon.FINAL_SLOPE[index])) {
              //console.log("MSG: pointFound, In findPoint, Index and PCT Error", this.Geobon.FINAL_SLOPE[index] , index);
              //return -1;
          } else {
              const PCT_Error = (Math.abs(this.Geobon.FINAL_SLOPE[index] - this.slopePercentage)) / this.slopePercentage;;
              //console.log("MSG: In findPoint, Slope", this.Geobon.FINAL_SLOPE[index], "user Slope", this.slopePercentage, "PCT Error", PCT_Error);
              if (PCT_Error <= this.dnSlopePCTtolerance) {
                  //console.log("MSG: pointFound, In findPoint, Index and PCT Error", PCT_Error, index);
                  minDis = (minDis <= this.Geobon.DEM_ZOC_CandDistances[index]) ? minDis : this.Geobon.DEM_ZOC_CandDistances[index];
              } 
          }
      }
      //console.log("MSG: Printing closest", this.Geobon.DEM_ZOC_CandDistances);
      if (minDis === Infinity ) { 
          return -1; 
      } else {
          return this.Geobon.DEM_ZOC_CandDistances.indexOf(minDis);
      }
      //const reessd = this.Geobon.DEM_ZOC_CandDistances.indexOf(minDis);
      //console.log("MSG: MINPOINT", minDis, reessd);
      //if (Math.min(this.Geobon.PICK_CLOSEST) != 1000000 ) { 
      //	return this.Geobon.PICK_CLOSEST.indexOf(Math.min(this.Geobon.PICK_CLOSEST));
      //} else {
      //	return -1;
      //}
  }
      
  drawnNdistCheck(IntIndex) {
      console.log("MSG: Entered drawnNdistCheck, computing distance checks and conversions for the current slope line segment");
  
      const IntermStep = this.Geobon.DEM_ZOC_Indexes[IntIndex];
      const IniX = this.SearchDir_CS4[0][0];
      const IniY = this.SearchDir_CS4[0][1];
      //this.printArray2Console("Geometry of Initial Search Direction ",this.SearchDir_CS4);
      const IniRL_CS4 = [IniX, IniY];
      const IniRL = this.basemapService.getTransformedCoordinates([IniX, IniY], this.DEM.CS4, this.DEM.CS1);
  
      const FinX = this.SearchDir_CS4[1][0];
      const FinY = this.SearchDir_CS4[1][1];
  
      //this.printArray2Console("Geometry of Final Points of Search Direction ",[FinX, FinY]);
  
      //this.printArray2Console("Geometry of LLC ",[this.DEM.LLC_CS4x, this.DEM.LLC_CS4y]);
  
      const IntermX = parseFloat(this.DEM.LLC_CS4x) + IntermStep[1] * (this.DEM.Res_CS4);
      const IntermY = parseFloat(this.DEM.LLC_CS4y) + (this.DEM.RCOUNT_ASCII-IntermStep[0]) * (this.DEM.Res_CS4);
      const distanceFININI =  Math.sqrt(Math.pow((this.SearchDir_CS4[1][1] - IntermY), 2) + Math.pow((this.SearchDir_CS4[1][0] - IntermX), 2));
      const FinRL = this.basemapService.getTransformedCoordinates([IntermX, IntermY], this.DEM.CS4, this.DEM.CS1);
      const FinRL_CS4 = [IntermX, IntermY];
      const Redline = [ IniRL , FinRL ] ; 
      const Redline_CS4 = [IniRL_CS4, FinRL_CS4]; 
  
      this.SearchDir_CS4 = [ [IntermX, IntermY], [FinX, FinY] ];
  
      this.printArray2Console("Geometry of New Search Direction ",this.SearchDir_CS4);
      this.printArray2Console("Geometry of New Redline CS4", Redline_CS4);
      this.printArray2Console("Geometry of New Redline CS1", Redline);
  
      //const IntermStepCS1 = this.basemapService.getTransformedCoordinates([this.SearchDir_CS4[0][0], this.SearchDir_CS4[0][1]], this.DEM.CS4, this.DEM.CS1);
  
      this.drawTheRed(Redline);
  
      if (distanceFININI < this.DEM.Resolution) {
          console.log("DEBUG-MSG: leaving drawnNdistCheck, found close enough point", distanceFININI, this.DEM.Resolution)
          return 1; 
      } else {
          console.log("DEBUG-MSG: leaving drawnNdistCheck, didn't find close enough point", distanceFININI, this.DEM.Resolution)
          return 0;
      }
  
  
  
  
  }
  
  drawTheRed(LV) {
      //this.printArray2Console("Geometry of REDLINE STEP 5",LV);
      const lineFeatures = [];
      const capturedPoint = new Point([LV[0][0], LV[0][1]]);
      // LV.forEach((coord) => {
      const coordPoint = new Point([LV[1][0], LV[1][1]]);
      const line = new LineString([capturedPoint.getCoordinates(),coordPoint.getCoordinates(),]);
      console.log(line, 'line')
      const feature = new Feature(line);
      lineFeatures.push(feature);
      const vertexFeature = new Feature({
          geometry: new Point(coordPoint.getCoordinates()),
      });
      const vertexVectorSource = new VectorSource({
          features: [vertexFeature],
      });
      console.log(lineFeatures, 'linefeatures')
      // });
      const lineVectorSource = new VectorSource({features: lineFeatures,});
      const lineVectorLayer = new VectorLayer({source: lineVectorSource,
          style: new Style({
              stroke: new Stroke({
                  color: 'red',
                  width: 2,
              }),
          }),
          name: 'slopeLayer'
      });
      const vertexVectorLayer = new VectorLayer({
          source: vertexVectorSource,
          style: new Style({
              image: new CircleStyle({
                  radius: 4,
                  fill: new Fill({
                      color: 'red',
                  }),
                  stroke: new Stroke({
                      color: 'white',
                  })
              }),
          }),
          name: 'slopeLayer'
      });
      lineVectorLayer.id = `${this.drawnLines}_slope`;
      vertexVectorLayer.id = `${this.drawnLines}_slope`;
      this.basemap.addLayer(lineVectorLayer);
      this.basemap.addLayer(vertexVectorLayer);
      lineVectorLayer.setZIndex(3);
      vertexVectorLayer.setZIndex(3);
      this.cancelSlopeElement();
      console.log("MSG: Finished drawing line on screen");
  }
  
  displayColumnDropdown(layer) {
      // Doing operation for geometry properties and adding lables
      console.log('what is event and layer data ', layer);
      this.layer = layer;
      const featureProperties = [];
      const featurePropertieHeders = [];
      if(layer.fileType !== '.zip') {
        this.basemap.getLayers().forEach((layerObj) => {
          if (layerObj.values_.name === layer.name) {
            console.log(layerObj)
            console.log('features ', layerObj.getSource().getFeatures())
            layerObj.getSource().getFeatures().forEach((feature, index) => {
              const featureAttr = (layer.fileType === '.xlsx') ? feature.values_.id : feature.values_;
              if (index === 0) {
                for (const [key, value] of Object.entries(featureAttr)) {
                  console.log(key,value)
                  featurePropertieHeders.push(key);
                }
              }
              featureProperties.push(featureAttr);
            });
          }
        })
      } else {
        layer.metadata[0].features.forEach((feature, index) => {
          if (index === 0) {
            for (const [key, value] of Object.entries(feature.properties)) {
              featurePropertieHeders.push(key);
            }
          }
          featureProperties.push(feature.properties);
        });
      }
      console.log('final dropdown data is ', featureProperties, featurePropertieHeders);
      this.columnsList = featurePropertieHeders;
  }
  onChangeColumn(columnName) {
      console.log('column dropdown changed ', columnName);
      this.selectedLable = columnName;
  }
  generatefrf(): any {
      this.ngProgress.ref().start();
      if(this.selectedLable === 'Z-Axis') {
        // window.alert('please select elevation value for generate FRF file');
        this.authObsr.updateErrors("please select elevation value");
        this.ngProgress.ref().complete();
        return;
      }
      this.basemap.getLayers().forEach(layerObj => {
        if (layerObj !== undefined) {
          if (layerObj.values_.name === this.layer.name) {
            layerObj.setZIndex(2);
          }
        }
      });
      const layerObj = this.layer;
      const fileInput: any = layerObj;
      console.log(fileInput.zipfile);
      const formdata = new FormData();
      formdata.append("file", fileInput.zipfile, fileInput.name);
      const requestOptions = {
        method: 'POST',
        body: formdata,
        redirect: 'follow'
      };
      // $('.loader').fadeIn()
      fetch("https://qa.fuse.earth:4433", {
        method: 'POST',
        body: formdata,
        redirect: 'follow'
      })
        .then(response => response.text())
        .then(result => {
          // this.rasterFileClickEvent()
          console.log(result, this.rasters)
          // debugger
          this.rasters = result;
          this.layerInfoRestAPI(result)
          // this.rasterFileClickEvent()
          // let allLayer = map.getAllLayers()
          // allLayer.forEach(layer => {
          //   if(layer.getProperties().title != undefined){
          //     map.removeLayer(layer)
          //   }
          // });
          if(fileInput.name.includes('.zip') || fileInput.name.includes('.kml') || fileInput.name.includes('.geojson')){
            let vectorLayer = fileInput.name.split('.')[0]
            // this.loadWms(fileInput.name, '')
            // document.getElementById("vector-layer").style.display = "block";
          }
          else{
            // document.getElementById("vector-layer").style.display = "none";
            // this.publish(result)
          }
        })
        .catch(error => {
            console.log('error', error); 
            this.authObsr.updateErrors(error);
            this.ngProgress.ref().complete();
        })
    }
  
    layerInfoRestAPI(fileName):any {
      let url = "https://qa.fuse.earth:4433/info?filename=" + fileName
      fetch(url, {
        method: 'GET',
        redirect: 'follow'
      })
        .then(response => response.json())
        .then(result => {
          console.log(result)
          console.log(result.length)
          console.log(result[0], result[1])
          this.loadShpRestAPI(result[0], this.selectedLable)
        })
        .catch(error => {
          console.log('error', error); 
          this.authObsr.updateErrors(error);
          this.ngProgress.ref().complete();
        })
    }
  
    loadShpRestAPI(shpFilePath, elevationName): any {
      let url = "https://qa.fuse.earth:4433/loadshp?shp_file_path=" + shpFilePath + "&elev=" + elevationName
      fetch(url, {
        method: 'GET',
        redirect: 'follow'
      })
        .then(response => response.json())
        .then(result => {
          console.log(result)
          this.demRestAPI(result[0], result[1], result[2])
        })
        .catch(error => {
          console.log('error', error); 
          this.authObsr.updateErrors(error);
          this.ngProgress.ref().complete();
        })
  
    }
    demRestAPI(fileName, epsg, elevationIndex):any {
      let url = "https://qa.fuse.earth:4433/dem?filename=" + fileName + "&utm_zone=" + epsg + "&elevation_index=" + elevationIndex
      fetch(url, {
        method: 'GET',
        redirect: 'follow'
      })
        .then(response => response.text())
        .then(result => {
          console.log(result)
          // window.alert('Firebase URL ' + result)
          this.publish(result)
        })
        .catch(error => {
          console.log('error', error); 
          this.authObsr.updateErrors(error);
          this.ngProgress.ref().complete();
        })
    }
    publish(filename){  
      console.log(filename)
      var formdata = new FormData(); 
      var requestOptions = {
        method: 'GET',
        redirect: 'follow'
      };
      let url = "https://qa.fuse.earth:4433/publish?filename=" + filename
      fetch(url, {
        method: 'GET',
        redirect: 'follow'
      })
        .then(response => response.json())
        .then(result => {
          // debugger
          console.log(result)
          this.fileUrl = result[1];
          window.alert('Firebase URL ' + result[1])
          // this.commonService.setFirebaseFRFUrl(result[1]);
          this.commonService.firebaseFRFUrl = result[1];
          // this.fetchingFirebaseURLData();
          window.open(result[1], '_blank')
          this.loadWms(result[0], '')
        })
        .catch(error => {
          console.log('error', error); 
          this.authObsr.updateErrors(error);
          this.ngProgress.ref().complete();
        });
    }
    
    loadWms(layerName, vector_flag): any {
      this.ngProgress.ref().complete();
      const layer = 'giskernel:' + layerName;
      const tiled = new TileLayer({
        visible: true,
        title: layerName,
        source: new TileWMS({
          url: 'https://qa.fuse.earth:4433/geoserver/giskernel/wms',
          params: {'FORMAT': 'image/png', 
                   'VERSION': '1.1.1',
                   tiled: false,
                "STYLES": '',
                "LAYERS": layer,
                "exceptions": 'application/vnd.ogc.se_inimage',
             //tilesOrigin: -104.92041666666667 + "," + 36.59374999999999
          },
          projection: 'EPSG:3857',
        }),
        zIndex:1
      });
    
      
      // LayerGr.getLayers().push(tiled);
      // document.getElementById("raster-layer").style.display = "block";
      this.basemap.addLayer(tiled)
      // $('.loader').fadeOut()
    }
  
  
  }  
  
  
  