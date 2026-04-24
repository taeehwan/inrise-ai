import { Button } from "@/components/ui/button";
import { Play, Images, Mic, Download } from "lucide-react";

export default function ContentPreview() {
  return (
    <section className="py-20 bg-charcoal text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold mb-4">Experience a Preview</h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Get a taste of our exclusive content before you subscribe. See why thousands choose Artisan Collective.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <img 
              src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
              alt="Art enthusiasts viewing paintings in gallery" 
              className="rounded-lg shadow-2xl w-full h-auto"
            />
          </div>
          <div>
            <h3 className="text-3xl font-display font-semibold mb-6">
              "The Evolution of Abstract Expressionism"
            </h3>
            <p className="text-gray-300 mb-6 leading-relaxed text-lg">
              Discover how abstract expressionism revolutionized the art world in the mid-20th century. From Jackson Pollock's drip paintings to Mark Rothko's color field works, explore the movement that shifted the art world's center from Paris to New York.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex items-center">
                <Play className="text-golden mr-3 w-6 h-6" />
                <span>45-minute video documentary</span>
              </div>
              <div className="flex items-center">
                <Images className="text-golden mr-3 w-6 h-6" />
                <span>120+ high-resolution artwork images</span>
              </div>
              <div className="flex items-center">
                <Mic className="text-golden mr-3 w-6 h-6" />
                <span>Expert commentary from MoMA curators</span>
              </div>
              <div className="flex items-center">
                <Download className="text-golden mr-3 w-6 h-6" />
                <span>Downloadable study guide (Premium+)</span>
              </div>
            </div>
            <Button className="bg-golden text-charcoal px-8 py-3 rounded-full font-semibold hover:bg-golden/90 transition-all">
              Watch Preview
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
