import {Injectable, Inject} from "angular2/di";
import {
  RenderViewRef,
  RenderFragmentRef,
  RenderViewWithFragments
} from "angular2/src/core/render/api";
import {ON_WEB_WORKER} from "angular2/src/web_workers/shared/api";
import {List, ListWrapper} from "angular2/src/core/facade/collection";

@Injectable()
export class RenderViewWithFragmentsStore {
  private _nextIndex: number = 0;
  private _onWebWorker: boolean;
  private _lookupByIndex: Map<number, RenderViewRef | RenderFragmentRef>;
  private _lookupByView: Map<RenderViewRef | RenderFragmentRef, number>;

  constructor(@Inject(ON_WEB_WORKER) onWebWorker) {
    this._onWebWorker = onWebWorker;
    this._lookupByIndex = new Map<number, RenderViewRef | RenderFragmentRef>();
    this._lookupByView = new Map<RenderViewRef | RenderFragmentRef, number>();
  }

  allocate(fragmentCount: number): RenderViewWithFragments {
    var initialIndex = this._nextIndex;

    var viewRef = new WebWorkerRenderViewRef(this._nextIndex++);
    var fragmentRefs = ListWrapper.createGrowableSize(fragmentCount);

    for (var i = 0; i < fragmentCount; i++) {
      fragmentRefs[i] = new WebWorkerRenderFragmentRef(this._nextIndex++);
    }
    var renderViewWithFragments = new RenderViewWithFragments(viewRef, fragmentRefs);
    this.store(renderViewWithFragments, initialIndex);
    return renderViewWithFragments;
  }

  store(view: RenderViewWithFragments, startIndex: number) {
    this._lookupByIndex.set(startIndex, view.viewRef);
    this._lookupByView.set(view.viewRef, startIndex);
    startIndex++;

    ListWrapper.forEach(view.fragmentRefs, (ref) => {
      this._lookupByIndex.set(startIndex, ref);
      this._lookupByView.set(ref, startIndex);
      startIndex++;
    });
  }

  retreive(ref: number): RenderViewRef | RenderFragmentRef {
    if (ref == null) {
      return null;
    }
    return this._lookupByIndex.get(ref);
  }

  serializeRenderViewRef(viewRef: RenderViewRef): number {
    return this._serializeRenderFragmentOrViewRef(viewRef);
  }

  serializeRenderFragmentRef(fragmentRef: RenderFragmentRef): number {
    return this._serializeRenderFragmentOrViewRef(fragmentRef);
  }

  deserializeRenderViewRef(ref: number): RenderViewRef {
    if (ref == null) {
      return null;
    }

    return this.retreive(ref);
  }

  deserializeRenderFragmentRef(ref: number): RenderFragmentRef {
    if (ref == null) {
      return null;
    }

    return this.retreive(ref);
  }

  private _serializeRenderFragmentOrViewRef(ref: RenderViewRef | RenderFragmentRef): number {
    if (ref == null) {
      return null;
    }

    if (this._onWebWorker) {
      return (<WebWorkerRenderFragmentRef | WebWorkerRenderViewRef>ref).serialize();
    } else {
      return this._lookupByView.get(ref);
    }
  }

  serializeViewWithFragments(view: RenderViewWithFragments): StringMap<string, any> {
    if (view == null) {
      return null;
    }

    if (this._onWebWorker) {
      return {
        'viewRef': (<WebWorkerRenderViewRef>view.viewRef).serialize(),
        'fragmentRefs': ListWrapper.map(view.fragmentRefs, (val) => val.serialize())
      };
    } else {
      return {
        'viewRef': this._lookupByView.get(view.viewRef),
        'fragmentRefs': ListWrapper.map(view.fragmentRefs, (val) => this._lookupByView.get(val))
      };
    }
  }

  deserializeViewWithFragments(obj: StringMap<string, any>): RenderViewWithFragments {
    if (obj == null) {
      return null;
    }

    var viewRef = this.deserializeRenderViewRef(obj['viewRef']);
    var fragments =
        ListWrapper.map(obj['fragmentRefs'], (val) => this.deserializeRenderFragmentRef(val));

    return new RenderViewWithFragments(viewRef, fragments);
  }
}

export class WebWorkerRenderViewRef extends RenderViewRef {
  constructor(public refNumber: number) { super(); }
  serialize(): number { return this.refNumber; }

  static deserialize(ref: number): WebWorkerRenderViewRef {
    return new WebWorkerRenderViewRef(ref);
  }
}

export class WebWorkerRenderFragmentRef extends RenderFragmentRef {
  constructor(public refNumber: number) { super(); }

  serialize(): number { return this.refNumber; }

  static deserialize(ref: number): WebWorkerRenderFragmentRef {
    return new WebWorkerRenderFragmentRef(ref);
  }
}
