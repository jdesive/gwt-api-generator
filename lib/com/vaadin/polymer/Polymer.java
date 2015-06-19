package com.vaadin.polymer;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.Document;
import com.google.gwt.dom.client.Element;
import com.google.gwt.user.client.Timer;
import com.vaadin.polymer.elemental.Function;

public abstract class Polymer {

    private static Set<String> urlImported = new HashSet<>();

    /**
     * Inserts the appropriate &lt;import&gt; of a component given by url.
     *
     * @param href either an absolute url or a path relative to bower_components folder.
     */
    public static void importHref(String href) {
        importHref(href, null, null);
    }

    /**
     * Inserts the appropriate &lt;import&gt; of a component given by url.
     *
     * @param href either an absolute url or a path relative to bower_components folder.
     * @param ok callback to run in case of success
     */
    public static void importHref(String href, Function ok) {
        importHref(href, ok, null);
    }

    /**
     * Inserts the appropriate &lt;import&gt; of a component given by url.
     *
     * @param hrefOrTag it can be an absolute url, a relative path or a tag name.
     *                  - if it is a relative path, we prefix it with bower_components
     *                  in case it is not already prefixed.
     *                  - if it is a tag, we compose the relative url:
     *                  bower_components/tagName/tagName.html
     * @param ok callback to run in case of success
     * @param err callback to run in case of failure
     */
    public static void importHref(String hrefOrTag, Function ok, Function err) {
        if (!hrefOrTag.startsWith("http")) {
            // It's a tag
            if (hrefOrTag.matches("[\\w-]+")) {
                hrefOrTag = hrefOrTag + "/" + hrefOrTag + ".html";
            }
            // It's not prefixed with the bower_components convention
            if (!hrefOrTag.startsWith("bower_components")) {
                hrefOrTag = "bower_components/" + hrefOrTag;
            }
            hrefOrTag = GWT.getModuleBaseForStaticFiles() + hrefOrTag;
        }
        if (!urlImported.contains(hrefOrTag)) {
            urlImported.add(hrefOrTag);
            importHrefImpl(hrefOrTag, ok, err);
        }
    }

    /**
     * Inserts the appropriate &lt;import&gt; of a list of components
     *
     * @param hrefs a list of absolute urls or relative paths to load.
     * @param ok callback to run in case of all import success
     * @param err callback to run in case of failure
     */
    public static void importHref(final List<String> hrefs, final Function ok) {
        importHref(hrefs, ok, null);
    }

    /**
     * Inserts the appropriate &lt;import&gt; of a list of components
     *
     * @param hrefs a list of absolute urls or relative paths to load.
     * @param ok callback to run in case of all import success
     * @param err callback to run in case of failure
     */
    public static void importHref(final List<String> hrefs, final Function ok, Function err) {
        Function allOk = new Function() {
            int count = hrefs.size();
            public Object call(Object arg) {
                if (--count == 0) {
                    ok.call(arg);
                }
                return null;
            }
        };
        for (String href : hrefs) {
            importHref(href, allOk, err);
        }
    }

    /**
     * Returns a new instance of the Element. It loads the web component
     * from the bower_components/src url if it was not loaded yet.
     */
    public static <T> T createElement(final String tagName, final String... imports) {
        @SuppressWarnings("unchecked")
        final T e = (T)Document.get().createElement(tagName);
        if (imports.length > 0) {
            ensureCustomElement(e, imports);
        } else {
            ensureCustomElement(e, tagName);
        }
        return e;
    }

    public static <T> void ensureCustomElement(final T elem, String... imports) {
        if (isRegisteredElement(elem)) {
            return;
        }

        // Delay this so as the developer gets an early version of the element and
        // can assign properties soon.
        new Timer() {
            public void run() {
                // We need to remove ownProperties from the element when it's not
                // registered because a bug in Polymer 1.0.x
                // https://github.com/Polymer/polymer/issues/1882
                saveProperties((Element)elem);
            }
        }.schedule(0);

        //
        new Timer() {
            public void run() {
                // Restore saved ownProperties
                restoreProperties((Element)elem);
            }
        }.schedule(5);

        for (String src : imports) {
            importHref(src, null, null);
        }
    }

    /**
     * Returns a new instance of the Element. It loads the web component
     * from the bower_components/tagName/tagName.html url if not loaded yet.
     */
    public static <T> T createElement(String tagName) {
        return createElement(tagName, new String[]{});
    }

    /**
     * Returns the JsInterop instance of Document
     */
    public static com.vaadin.polymer.elemental.Document getDocument() {
        return (com.vaadin.polymer.elemental.Document)Document.get();
    }

    /**
     * Check whether a certain custom element has been registered.
     */
    private native static boolean isRegisteredElement(Object e)
    /*-{
        return !!e && e.constructor !== $wnd.HTMLElement && e.constructor != $wnd.HTMLUnknownElement;
    }-*/;

    /**
     * Dynamically import a link and monitors when it has been loaded.
     *
     * This could be done via Polymer importHref, but the method needs a custom element
     * instance to be run.
     */
    private native static Element importHrefImpl(String href, Function onload, Function onerror)
    /*-{
        // TODO(manolo): use Polymer.Base.importHref when it works in FF
        var l = $doc.createElement('link');
        l.rel = 'import';
        l.href = href;
        if (onload) {
          l.onload = function() {
             onload.@com.vaadin.polymer.elemental.Function::call(*)(href);
          }
        }
        if (onerror) {
          l.onerror = function() {
              onerror.@com.vaadin.polymer.elemental.Function::call(*)(href);
          }
        }
        $doc.head.appendChild(l);
        return l;
    }-*/;

    /**
     * Restore all properties saved previously to the element was
     * registered.
     *
     * Hack for: https://github.com/Polymer/polymer/issues/1882
     */
    private static native void restoreProperties(Element e)
    /*-{
        if (e && e.__o) {
            var id = setInterval(function() {
                if (@com.vaadin.polymer.Polymer::isRegisteredElement(*)(e)) {
                    clearInterval(id);
                    for (i in e.__o) {
                        e[i] = e.__o[i];
                    }
                    delete e.__o;
                }
            }, 0);
        }
    }-*/;

    /**
     * Read all element properties and save in a JS object in the element,
     * so as we can restore then once the element is registered.
     *
     * We consider all ownProperties but those beginning or ending with '_'
     * which is the symbol used by webcomponentjs to store private info.
     *
     * Hack for: https://github.com/Polymer/polymer/issues/1882
     */
    private static native boolean saveProperties(Element e)
    /*-{
        if (!@com.vaadin.polymer.Polymer::isRegisteredElement(*)(e)) {
            var o = {};
            for (i in e) {
                if (e.hasOwnProperty(i) && !/(^_|_$)/.test(i)) {
                    o[i] = e[i];
                    delete(e[i]);
                    e.__o = o;
                }
            }
        }
    }-*/;
}