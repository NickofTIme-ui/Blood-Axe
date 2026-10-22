// A dedicated scene keeps the art independent of arena scrolling and zoom.
export class BirthrightArt {
  constructor(scene) { this.scene=scene; }
  show(kind) {
    if(this.scene.scene.isActive('Birthright')) {
      this.scene.scene.get('Birthright').show(kind);
    }else this.scene.scene.launch('Birthright',{kind});
  }
  grief() {
    this.show('grief');
  }
  clear() { this.scene.scene.stop('Birthright'); }
}
