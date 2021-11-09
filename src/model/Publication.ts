/*
 * Copyright 2018-2020 DITA (AM Consulting LLC)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Developed on behalf of: DITA
 * Licensed to: Bokbasen AS and CAST under one or more contributor license agreements.
 */

import { Locator } from "./Locator";
import { Link } from "./Link";
import { Publication as R2Publication } from "r2-shared-js/dist/es6-es2015/src/models/publication";
import { Link as R2Link } from "r2-shared-js/dist/es6-es2015/src/models/publication-link";
import { JsonObject } from "ta-json-x";
import { SampleRead } from "../navigator/IFrameNavigator";

@JsonObject()
export class Publication extends R2Publication {
  manifestUrl: URL;
  public positions: Array<Locator>;

  sample: SampleRead;
  get readingOrder() {
    return this.Spine;
  }
  get tableOfContents() {
    if (this.sample?.isSampleRead && this.positions?.length > 0) {
      return this.limitedTOC();
    }
    return this.TOC;
  }

  private limitedTOC() {
    function disableChildren(item) {
      for (let index = 0; index < item.Children.length; index++) {
        let child = item.Children[index];
        child.Href = undefined;
        if (child.Children) {
          disableChildren(child);
        }
      }
    }

    let toc = this.TOC.map((item) => {
      if (item.Href) {
        const positions = this.positionsByHref(this.getRelativeHref(item.Href));
        if (positions?.length > 0) {
          const locator = positions[0];
          let progress = Math.round(locator.locations.totalProgression * 100);
          let valid = progress <= this.sample?.limit;
          if (!valid) {
            item.Href = undefined;
            if (item.Children) {
              disableChildren(item);
            }
          }
        }
      }
      return item;
    });
    return toc;
  }

  get landmarks() {
    return this.Landmarks;
  }
  get pageList() {
    return this.PageList;
  }

  public getStartLink(): Link | null {
    if (this.readingOrder.length > 0) {
      return this.readingOrder[0] as Link;
    }
    return null;
  }

  public getPreviousSpineItem(href: string): Link | null {
    const index = this.getSpineIndex(href);
    if (index !== null && index > 0) {
      return this.readingOrder[index - 1] as Link;
    }
    return null;
  }

  public getNextSpineItem(href: string): Link | null {
    const index = this.getSpineIndex(href);
    if (index !== null && index < this.readingOrder.length - 1) {
      return this.readingOrder[index + 1] as Link;
    }
    return null;
  }

  public getSpineItem(href: string): Link | null {
    const index = this.getSpineIndex(href);
    if (index !== null) {
      return this.readingOrder[index] as Link;
    }
    return null;
  }

  public getSpineIndex(href: string): number | null {
    return this.readingOrder.findIndex(
      (item) =>
        item.Href && this.getAbsoluteHref(item.Href) === href
    );
  }

  public getAbsoluteHref(href: string): string | null {
    return new URL(href, this.manifestUrl.href).href;
  }

  public getRelativeHref(href: string): string | null {
    let h = href;
    if (h.indexOf("#") > 0) {
      h = h.slice(0, h.indexOf("#"));
    }
    if (h.charAt(0) === "/") {
      h = h.substring(1);
    }
    return h;
  }

  public getTOCItemAbsolute(href: string): Link | null {
    const absolute = this.getAbsoluteHref(href);
    const findItem = (href: string, links: Array<R2Link>): Link | null => {
      for (let index = 0; index < links.length; index++) {
        const item = links[index] as Link;
        if (item.Href) {
          const hrefAbsolutre =
            item.Href.indexOf("#") !== -1
              ? item.Href.slice(0, item.Href.indexOf("#"))
              : item.Href;
          const itemUrl = this.getAbsoluteHref(hrefAbsolutre);
          if (itemUrl === href) {
            return item;
          }
        }
        if (item.Children) {
          const childItem = findItem(href, item.Children);
          if (childItem !== null) {
            return childItem;
          }
        }
      }
      return null;
    };
    let link = findItem(absolute, this.tableOfContents);
    if (link === null) {
      link = findItem(absolute, this.readingOrder);
    }
    return link;
  }

  public getTOCItem(href: string): Link | null {
    const findItem = (href: string, links: Array<R2Link>): Link | null => {
      for (let index = 0; index < links.length; index++) {
        const item = links[index] as Link;
        if (item.Href) {
          const itemUrl = this.getAbsoluteHref(item.Href);
          if (itemUrl === href) {
            return item;
          }
        }
        if (item.Children) {
          const childItem = findItem(href, item.Children);
          if (childItem !== null) {
            return childItem;
          }
        }
      }
      return null;
    };
    let link = findItem(href, this.tableOfContents);
    if (link === null) {
      link = findItem(href, this.readingOrder);
    }
    if (link === null) {
      if (href.indexOf("#") !== -1) {
        const newResource = href.slice(0, href.indexOf("#"));
        link = findItem(newResource, this.tableOfContents);
        if (link === null) {
          link = findItem(newResource, this.readingOrder);
        }
      }
    }
    return link;
  }

  /**
   * positionsByHref
   */
  public positionsByHref(href: string) {
    const decodedHref = decodeURI(href) ?? "";
    return this.positions?.filter((p: Locator) => decodedHref.includes(p.href));
  }

  get hasMediaOverlays(): boolean {
    return this.readingOrder
      ? this.readingOrder.filter((el: Link) => el.Properties?.MediaOverlay)
        .length > 0
      : false;
  }
}
