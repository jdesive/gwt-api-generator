package com.vaadin.polymer;

import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.shared.HandlerRegistration;
import com.google.gwt.safehtml.shared.SafeHtml;
import com.google.gwt.user.client.ui.HTMLPanel;

public class PolymerWidget extends HTMLPanel {

    public PolymerWidget(String tag, String src, String html) {
        super(tag, html);
        Polymer.ensureCustomElement(getElement(), tag, src);
    }

    public PolymerWidget(String tag, SafeHtml safeHtml) {
        super(tag, safeHtml.asString());
    }


    public void setDisabled(boolean disabled) {
        setBooleanAttribute("disabled", disabled);
    }

    public void setBooleanAttribute(String name, boolean value) {
        if (value) {
            getElement().setAttribute(name, "");
        } else {
            getElement().removeAttribute(name);
        }
    }

    // TODO: Remove this hack for paper-radio-button
    public void setName(String value) {
        getElement().setAttribute("name", value);
    }

    public void setNoink(boolean noink) {
        setBooleanAttribute("noink", noink);
    }
    public void setTabindex(int index) {
        getElement().setAttribute("tabindex", "" + index);
    }

    public HandlerRegistration addClickHandler(ClickHandler handler) {
        return addDomHandler(handler, ClickEvent.getType());
    }
}